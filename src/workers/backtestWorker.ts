import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import { Prisma } from '@prisma/client'
import path from 'path'
import { promises as fs } from 'fs'
import { TradeData, BacktestResultsSummary } from '@/types/chart'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Helper function to format duration from object to string
const formatDuration = (duration: any): string => {
  if (typeof duration === 'string') {
    return duration;
  }
  if (typeof duration === 'object' && duration !== null) {
    const parts = [];
    if (duration.days) parts.push(`${duration.days}d`);
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    if (parts.length === 0) return '0m';
    return parts.join(' ');
  }
  return 'N/A';
};

// Helper function to format pair metrics from array to object
const formatPairMetrics = (pairData: any): { pair: string; profit_sum: number; profit_sum_pct: number; } | null => {
  if (
    typeof pairData === 'object' &&
    pairData !== null &&
    'key' in pairData &&
    typeof pairData.key === 'string' &&
    'profit_total_abs' in pairData &&
    typeof pairData.profit_total_abs === 'number' &&
    'profit_total' in pairData &&
    typeof pairData.profit_total === 'number'
  ) {
    return {
      pair: pairData.key,
      profit_sum: pairData.profit_total_abs,
      profit_sum_pct: pairData.profit_total
    };
  }
  
  // Fallback for other potential formats
  if (Array.isArray(pairData) && pairData.length === 3 && typeof pairData[0] === 'string' && typeof pairData[1] === 'number' && typeof pairData[2] === 'number') {
    return { pair: pairData[0], profit_sum: pairData[1], profit_sum_pct: pairData[2] };
  }
  if (typeof pairData === 'object' && pairData !== null && 'pair' in pairData && 'profit_sum' in pairData && 'profit_sum_pct' in pairData) {
    return pairData;
  }
  return null;
};

// 重命名数据文件为可识别的名称
async function renameDataFileForBacktest(
  exchange: string,
  pair: string,
  timeframe: string,
  timerangeStart: Date,
  timerangeEnd: Date,
  backtestId: string
): Promise<string | null> {
  try {
    const userDataPath = process.env.FREQTRADE_USER_DATA_PATH;
    if (!userDataPath) {
      throw new Error("FREQTRADE_USER_DATA_PATH environment variable is not set.");
    }

    const pairPath = pair.replace('/', '_');
    const dataDir = path.join(userDataPath, 'data', exchange.toLowerCase());
    const originalFile = `${pairPath}-${timeframe}.json`;
    const originalPath = path.join(dataDir, originalFile);

    // 生成新的文件名
    const startDate = timerangeStart.toISOString().split('T')[0].replace(/-/g, '');
    const endDate = timerangeEnd.toISOString().split('T')[0].replace(/-/g, '');
    const newFileName = `backtest-${backtestId}-${pair}-${timeframe}-${startDate}-${endDate}.json`;
    const newPath = path.join(dataDir, newFileName);

    // 检查原文件是否存在
    if (!(await fileExists(originalPath))) {
      console.warn(`Original data file not found: ${originalPath}`);
      return null;
    }

    // 复制文件到新路径
    await fs.copyFile(originalPath, newPath);
    console.log(`Data file copied from ${originalPath} to ${newPath}`);

    return newPath;
  } catch (error) {
    console.error('Failed to rename data file:', error);
    return null;
  }
}

// 检查文件是否存在
async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function unzipBacktestResult(zipPath: string, taskId: string): Promise<{ jsonPath: string | null, plotPath: string | null }> {
  const AdmZip = (await import('adm-zip')).default;
  const resultsDir = path.dirname(zipPath);

  try {
    console.log(`[${taskId}] Unzipping file: ${zipPath}`);
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    const jsonEntry = zipEntries.find(entry => entry.entryName.endsWith('.json') && !entry.isDirectory);
    const plotEntry = zipEntries.find(entry => entry.entryName.endsWith('.html') && !entry.isDirectory); // Assuming plot is .html

    if (!jsonEntry) {
      console.error(`[${taskId}] No .json file found inside ${zipPath}`);
      return { jsonPath: null, plotPath: null };
    }

    // Extract both files
    zip.extractEntryTo(jsonEntry.entryName, resultsDir, false, true);
    const jsonPath = path.join(resultsDir, jsonEntry.entryName);
    console.log(`[${taskId}] Successfully extracted ${jsonEntry.entryName} to ${jsonPath}`);
    
    let plotPath: string | null = null;
    if (plotEntry) {
      zip.extractEntryTo(plotEntry.entryName, resultsDir, false, true);
      plotPath = path.join(resultsDir, plotEntry.entryName);
      console.log(`[${taskId}] Successfully extracted ${plotEntry.entryName} to ${plotPath}`);
    }

    return { jsonPath, plotPath };

  } catch (error) {
    console.error(`[${taskId}] Failed to unzip file ${zipPath}:`, error);
    return { jsonPath: null, plotPath: null };
  }
}

async function findLatestBacktestResult(resultsDir: string, taskId: string): Promise<{ zipPath: string | null, metaPath: string | null }> {
  const fs = await import('fs').then(m => m.promises);
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      const files = await fs.readdir(resultsDir);
      const taskFilePrefix = `backtest-result-cli-${taskId}`;
      
      // Look for .zip and .meta.json files
      const matchingFiles = files.filter(file => file.startsWith(taskFilePrefix));
      
      if (matchingFiles.length > 0) {
        matchingFiles.sort().reverse();
        
        const metaFile = matchingFiles.find(file => file.endsWith('.meta.json'));
        const zipFile = matchingFiles.find(file => file.endsWith('.zip'));
        
        const zipPath = zipFile ? path.join(resultsDir, zipFile) : null;
        const metaPath = metaFile ? path.join(resultsDir, metaFile) : null;
        
        if (zipPath) {
          console.log(`Found result files - Zip: ${zipPath}, Meta: ${metaPath}`);
          return { zipPath, metaPath };
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Error reading results directory (attempt ${i + 1}/${maxRetries}):`, error);
      }
    }
    
    if (i < maxRetries - 1) {
      console.log(`Result files for task ${taskId} not found. Retrying in ${retryDelay}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.warn(`No result .zip file found for task ${taskId} in ${resultsDir} after ${maxRetries} retries.`);
  console.warn(`Expected a file starting with: backtest-result-cli-${taskId}*.zip`);
  return { zipPath: null, metaPath: null };
}

interface BacktestResult {
  strategy: {
    [strategyName: string]: BacktestResultsSummary & {
      trades: TradeData[];
      results_per_pair: any[];
      exit_reason_summary: any[];
      left_open_trades: any[];
    };
  };
  strategy_comparison: any[];
}

interface OverrideParams {
  [key: string]: unknown
  stake_amount?: number
  max_open_trades?: number
  timeframe?: string
  timerange?: string
}

export async function processBacktest(taskId: string, overrideParams?: OverrideParams) {
  try {
    // 更新任务状态为 RUNNING
    await prisma.backtestTask.update({
      where: { id: taskId },
      data: { status: 'RUNNING' },
    })

    // 获取任务详情
    const task = await prisma.backtestTask.findUnique({
      where: { id: taskId },
      include: { strategy: true, config: true },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // Prisma Client生成的类型已经包含关联关系，无需额外类型守卫
    // const backtestTask = task as BacktestTaskWithRelations
    const backtestTask = task;

    const logs: string[] = [];
    
    // 构建 freqtrade 命令
    const commandWithArgs = (process.env.FREQTRADE_PATH || 'freqtrade').split(' ')  
    const command = commandWithArgs[0]
    const baseArgs = commandWithArgs.slice(1)

    const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data');
    const containerUserDataPath = process.env.FREQTRADE_CONTAINER_USER_DATA_PATH || '/freqtrade/user_data';
    const exportFilename = `backtest-result-cli-${taskId}.json`;

    // 基础参数
    const args = [
      ...baseArgs,
      'backtesting',
      '--config', path.posix.join(containerUserDataPath, 'configs', backtestTask.config?.filename || ''),
      '--strategy', backtestTask.strategy.className,
      '--strategy-path', path.posix.join(containerUserDataPath, 'strategies'),
      '--timerange', `${backtestTask.timerangeStart?.toISOString().split('T')[0].replace(/-/g, '')}-${backtestTask.timerangeEnd?.toISOString().split('T')[0].replace(/-/g, '')}`,
      '--export', 'trades',
      '--export-filename', path.posix.join(containerUserDataPath, 'backtest_results', exportFilename),
      '--cache', 'none',
    ]

    // 处理参数覆盖
    if (overrideParams) {
      // 创建临时配置文件
      const tempConfigPath = path.join(userDataPath, 'temp_configs', `backtest-${taskId}-config.json`)
      const { mkdir, writeFile } = await import('fs/promises')
      
      await mkdir(path.join(userDataPath, 'temp_configs'), { recursive: true })
      
      // 读取原始配置
      const originalConfig = (backtestTask.config?.data as Record<string, unknown>) || {}
      const mergedConfig = { ...originalConfig, ...overrideParams }
      
      await writeFile(tempConfigPath, JSON.stringify(mergedConfig, null, 2))
      
      // 替换配置参数
      const configIndex = args.findIndex(arg => arg === '--config')
      if (configIndex !== -1) {
        args[configIndex + 1] = path.posix.join(containerUserDataPath, 'temp_configs', `backtest-${taskId}-config.json`)
      }
    }

    const commandString = `${command} ${args.join(' ')}`
    logs.push(commandString)
    redis.publish(`logs:${taskId}`, commandString + '\n')
    console.log(`Executing: ${commandString}`);

    // 启动子进程
    const child = spawn(command, args, {
      cwd: userDataPath, // 设置CWD为用户数据目录
      env: { ...process.env },
    } )

    // 实时日志处理
    child.stdout.on('data', (data) => {
      const log = data.toString()
      logs.push(log)
      redis.publish(`logs:${taskId}`, log)
      console.log(`[${taskId}] ${log}`)
    });

    child.stderr.on('data', (data) => {
      const log = data.toString()
      logs.push(log)
      redis.publish(`logs:${taskId}`, log)
      // Freqtrade often sends INFO and WARNING to stderr, so we log it as standard output
      // and will rely on string content for actual error detection.
      console.log(`[${taskId}] STDERR: ${log}`)
    })

    // 等待进程完成
    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', resolve)
    })

    logs.push(`\nFreqtrade process finished with exit code: ${exitCode}`);
    redis.publish(`logs:${taskId}`, `\nFreqtrade process finished with exit code: ${exitCode}\n`);
    console.log(`[${taskId}] Freqtrade process finished with exit code: ${exitCode}`);

    const fullLogs = logs.join('\n')

    // 清理临时文件
    if (overrideParams) {
      try {
        const { unlink } = await import('fs/promises')
        const tempConfigPath = path.join(userDataPath, 'temp_configs', `backtest-${taskId}-config.json`)
        await unlink(tempConfigPath)
      } catch (cleanupError) {
        console.warn(`Failed to clean up temporary config file: ${cleanupError}`)
      }
    }

    const backtestResultsDir = path.join(userDataPath, 'backtest_results');
    const { zipPath, metaPath } = await findLatestBacktestResult(backtestResultsDir, taskId);
    let resultPath: string | null = null;
    let plotProfitUrl: string | null = null;

    if (zipPath) {
      const { jsonPath, plotPath } = await unzipBacktestResult(zipPath, taskId);
      resultPath = jsonPath;
      plotProfitUrl = plotPath; // This will be the local file path
    }
    
    let resultsSummary: BacktestResultsSummary | null = null;
    let isSuccess = false;

    // Check for explicit errors in logs (excluding warnings and non-critical errors)
    const hasErrorInLog = fullLogs.includes('freqtrade - ERROR')
    
    // Log the status decision criteria
    console.log(`[${taskId}] Status Decision Criteria:`)
    console.log(`[${taskId}] - hasErrorInLog: ${hasErrorInLog}`)
    console.log(`[${taskId}] - exitCode: ${exitCode}`)
    console.log(`[${taskId}] - resultPath exists: ${!!resultPath}`)
    
    if (resultPath) {
      try {
        logs.push(`\nFound and extracted result file: ${resultPath}`);
        redis.publish(`logs:${taskId}`, `\nFound and extracted result file: ${resultPath}\n`);
        console.log(`[${taskId}] Processing result file: ${resultPath}`);

        const fs = await import('fs').then(m => m.promises);
        const resultData = await fs.readFile(resultPath, 'utf8');

        if (resultData.trim() === '') {
          throw new Error("Result file is empty after extraction.");
        }

        const result = JSON.parse(resultData) as BacktestResult;
        
        if (!result.strategy) {
          throw new Error("No strategy data found in result object.");
        }
        
        const strategyName = Object.keys(result.strategy)[0];
        if (!strategyName) {
          throw new Error("Strategy name not found in result object.");
        }
        const strategyResult = result.strategy[strategyName];

        // The new format contains all necessary info in one file.
        resultsSummary = { ...strategyResult } as BacktestResultsSummary;
        console.log(`[${taskId}] Using summary statistics from the main result file.`);

        // 数据格式化
        if (resultsSummary) {
          resultsSummary.avg_duration = formatDuration(strategyResult.holding_avg);
          resultsSummary.best_pair = formatPairMetrics(strategyResult.best_pair) as any;
          resultsSummary.worst_pair = formatPairMetrics(strategyResult.worst_pair) as any;
          resultsSummary.winrate = strategyResult.wins > 0 ? strategyResult.wins / strategyResult.total_trades : 0;
        }

        isSuccess = true; // Mark as success only if parsing is successful
        console.log(`[${taskId}] Successfully parsed result file for strategy: ${strategyName}`);

        // Save trades to database
        if (strategyResult.trades && strategyResult.trades.length > 0) {
          const tradesToCreate = strategyResult.trades.map(trade => ({
            pair: trade.pair,
            open_date: new Date(trade.open_timestamp),
            close_date: new Date(trade.close_timestamp),
            profit_abs: trade.profit_abs,
            profit_pct: trade.profit_ratio ?? trade.profit_pct ?? 0,
            open_rate: trade.open_rate,
            close_rate: trade.close_rate,
            amount: trade.amount,
            stake_amount: trade.stake_amount,
            trade_duration: trade.trade_duration,
            exit_reason: trade.exit_reason,
            backtestTaskId: taskId,
          }));

          await prisma.trade.createMany({
            data: tradesToCreate,
            skipDuplicates: true, // In case the worker runs again
          });
          console.log(`[${taskId}] Successfully saved ${tradesToCreate.length} trades to the database.`);
        }

      } catch (error) {
        console.error('Failed to read or process result file:', error);
        const errorMessage = `\nError processing result file: ${(error as Error).message}`;
        logs.push(errorMessage);
        redis.publish(`logs:${taskId}`, errorMessage + '\n');
        isSuccess = false; // Explicitly mark as failed on parsing error
      }
    }

    // 如果回测成功，重命名数据文件
    let candleDataFile = null;
    if (isSuccess && !hasErrorInLog && backtestTask.timerangeStart && backtestTask.timerangeEnd) {
      // 从交易中获取交易对信息
      const trades = await prisma.trade.findMany({
        where: { backtestTaskId: taskId },
        take: 1,
      });
      
      if (trades.length > 0) {
        const pair = trades[0].pair;
        const timeframe = backtestTask.timeframe || '5m';
        const exchange = 'binance'; // 默认交易所，可以从配置中获取
        
        candleDataFile = await renameDataFileForBacktest(
          exchange,
          pair,
          timeframe,
          backtestTask.timerangeStart,
          backtestTask.timerangeEnd,
          taskId
        );
      }
    }

    // Final decision based on multiple factors
    if (isSuccess && !hasErrorInLog) {
      console.log(`[${taskId}] STATUS SETTING: COMPLETED branch taken`)
      console.log(`[${taskId}] - Reason: isSuccess=${isSuccess}, hasErrorInLog=${hasErrorInLog}`)
      redis.publish(`logs:${taskId}`, `\n=== FINAL STATUS: COMPLETED ===\n`)
      redis.publish(`logs:${taskId}`, `Reason: isSuccess=${isSuccess}, hasErrorInLog=${hasErrorInLog}\n`)
      redis.publish(`logs:${taskId}`, `============================\n\n`)
      
      await prisma.backtestTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultsSummary: resultsSummary ?? Prisma.JsonNull,
          rawOutputPath: resultPath || metaPath, // Use resultPath if available, otherwise use metaPath
          plotProfitUrl: plotProfitUrl,
          candleDataFile: candleDataFile,
          logs: logs.join('\n'),
          // Populate new metrics from resultsSummary
          totalTrades: resultsSummary?.total_trades ?? null,
          avgTradeDuration: resultsSummary?.holding_avg_s ?? null,
          avgProfit: resultsSummary?.profit_mean ?? null,
          totalVolume: resultsSummary?.total_volume ?? null,
          profitFactor: resultsSummary?.profit_factor ?? null,
          expectancy: resultsSummary?.expectancy ?? null,
          sharpe: resultsSummary?.sharpe ?? null,
          sortino: resultsSummary?.sortino ?? null,
          calmar: resultsSummary?.calmar ?? null,
          cagr: resultsSummary?.cagr ?? null,
          maxDrawdown: resultsSummary?.max_drawdown_account ?? null,
          marketChange: resultsSummary?.market_change ?? null,
        },
      });
    } else {
      console.log(`[${taskId}] STATUS SETTING: FAILED branch taken`)
      console.log(`[${taskId}] - Reason: isSuccess=${isSuccess}, hasErrorInLog=${hasErrorInLog}`)
      redis.publish(`logs:${taskId}`, `\n=== FINAL STATUS: FAILED ===\n`)
      redis.publish(`logs:${taskId}`, `Reason: isSuccess=${isSuccess}, hasErrorInLog=${hasErrorInLog}\n`)
      redis.publish(`logs:${taskId}`, `==========================\n\n`)
      
      // Fail if parsing failed, no file was found, or there's an explicit error in the log.
      await prisma.backtestTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          logs: fullLogs,
          rawOutputPath: resultPath || metaPath, // Still save the path for debugging
          candleDataFile: candleDataFile,
        },
      });
    }
  } catch (error: any) { // Explicitly type error as any for now, refine later
    console.error('Error processing backtest:', error)
    
    // 更新任务状态为 FAILED
    await prisma.backtestTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        logs: error instanceof Error ? error.message : String(error), // Convert non-Error objects to string
      },
    })
  }
}
