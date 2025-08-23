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
const formatPairMetrics = (pairData: any): { pair: string; profit_sum: number } | null => {
  if (Array.isArray(pairData) && pairData.length === 2 && typeof pairData[0] === 'string' && typeof pairData[1] === 'number') {
    return { pair: pairData[0], profit_sum: pairData[1] };
  }
  if (typeof pairData === 'object' && pairData !== null && 'pair' in pairData && 'profit_sum' in pairData) {
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

async function findLatestBacktestResult(resultsDir: string, taskId: string): Promise<string | null> {
  const fs = await import('fs').then(m => m.promises);
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      const files = await fs.readdir(resultsDir);
      // New freqtrade versions store everything in a single JSON file.
      // We look for a file that is NOT a .meta.json but matches the task ID.
      const taskFilePrefix = `backtest-result-cli-${taskId}`;
      const matchingFiles = files.filter(file =>
        file.startsWith(taskFilePrefix) &&
        file.endsWith('.json') &&
        !file.endsWith('.meta.json')
      );

      if (matchingFiles.length > 0) {
        // Sort to get the most recent one if multiple exist (unlikely)
        matchingFiles.sort().reverse();
        const filePath = path.join(resultsDir, matchingFiles[0]);
        console.log(`Found primary result file: ${filePath}`);
        return filePath;
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Error reading results directory (attempt ${i + 1}/${maxRetries}):`, error);
      }
    }
    
    if (i < maxRetries - 1) {
      console.log(`Result file for task ${taskId} not found. Retrying in ${retryDelay}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.warn(`No primary result file found for task ${taskId} in ${resultsDir} after ${maxRetries} retries.`);
  console.warn(`Expected a file starting with: backtest-result-cli-${taskId}*.json`);
  return null;
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
    const resultPath = await findLatestBacktestResult(backtestResultsDir, taskId);
    let resultsSummary: BacktestResultsSummary | null = null;
    let plotProfitUrl = null;
    let isSuccess = false;

    // Check for explicit errors in logs (excluding warnings and non-critical errors)
    const hasErrorInLog = fullLogs.includes('freqtrade - ERROR')
    
    // Add debug logging for result path
    console.log(`[${taskId}] Result path: ${resultPath}`)
    console.log(`[${taskId}] Backtest results directory: ${backtestResultsDir}`)
    console.log(`[${taskId}] Expected filename: backtest-result-cli-${taskId}.meta.json`)
    
    // Log the status decision criteria
    console.log(`[${taskId}] Status Decision Criteria:`)
    console.log(`[${taskId}] - isSuccess: ${isSuccess}`)
    console.log(`[${taskId}] - hasErrorInLog: ${hasErrorInLog}`)
    console.log(`[${taskId}] - exitCode: ${exitCode}`)
    console.log(`[${taskId}] - resultPath exists: ${!!resultPath}`)
    console.log(`[${taskId}] - Contains 'freqtrade - ERROR': ${fullLogs.includes('freqtrade - ERROR')}`)
    console.log(`[${taskId}] - Contains 'pkg_resources is deprecated': ${fullLogs.includes('pkg_resources is deprecated')}`)
    console.log(`[${taskId}] - Contains 'UserWarning': ${fullLogs.includes('UserWarning')}`)
    
    // Add to Redis logs for user visibility
    redis.publish(`logs:${taskId}`, `\n=== STATUS DECISION DEBUG ===\n`)
    redis.publish(`logs:${taskId}`, `isSuccess: ${isSuccess}\n`)
    redis.publish(`logs:${taskId}`, `hasErrorInLog: ${hasErrorInLog}\n`)
    redis.publish(`logs:${taskId}`, `exitCode: ${exitCode}\n`)
    redis.publish(`logs:${taskId}`, `resultPath exists: ${!!resultPath}\n`)
    redis.publish(`logs:${taskId}`, `Contains 'freqtrade - ERROR': ${fullLogs.includes('freqtrade - ERROR')}\n`)
    redis.publish(`logs:${taskId}`, `Contains 'pkg_resources is deprecated': ${fullLogs.includes('pkg_resources is deprecated')}\n`)
    redis.publish(`logs:${taskId}`, `Contains 'UserWarning': ${fullLogs.includes('UserWarning')}\n`)
    redis.publish(`logs:${taskId}`, `===============================\n\n`)

    if (resultPath) {
      try {
        logs.push(`\nFound result file: ${resultPath}`);
        redis.publish(`logs:${taskId}`, `\nFound result file: ${resultPath}\n`);
        console.log(`[${taskId}] Found result file: ${resultPath}`);

        const fs = await import('fs').then(m => m.promises);
        const resultData = await fs.readFile(resultPath, 'utf8');

        // An empty file can be created on error, so check for content.
        if (resultData.trim() === '') {
          throw new Error("Main result file is empty.");
        }

        // 增加日志记录原始文件内容
        logs.push(`\n--- Raw Result File Content (from ${resultPath}) ---\n`);
        logs.push(resultData);
        logs.push(`\n--- End of Raw Result File Content ---\n`);
        redis.publish(`logs:${taskId}`, `\n--- Raw Result File Content (from ${resultPath}) ---\n`);
        redis.publish(`logs:${taskId}`, resultData + '\n');
        redis.publish(`logs:${taskId}`, `\n--- End of Raw Result File Content ---\n`);
        console.log(`[${taskId}] Raw result data from ${resultPath}:\n${resultData}`);

        let result: BacktestResult;
        try {
          result = JSON.parse(resultData) as BacktestResult;
        } catch (parseError) {
          console.error(`Failed to parse JSON from result file: ${parseError}`);
          console.error(`File content preview: ${resultData.substring(0, 500)}...`);
          throw new Error(`Invalid JSON in result file: ${(parseError as Error).message}`);
        }

        // The strategy name is the first key in the result.strategy object.
        const strategyName = Object.keys(result.strategy)[0];
        if (!strategyName) {
          throw new Error("Strategy name not found in result object.");
        }
        const strategyResult = result.strategy[strategyName];

        // The new format contains all necessary info in one file.
        resultsSummary = strategyResult as BacktestResultsSummary;
        console.log(`[${taskId}] Using summary statistics from the main result file.`);

        // 数据格式化
        if (resultsSummary) {
          // @ts-ignore
          resultsSummary.avg_duration = formatDuration(resultsSummary.holding_avg);
          // @ts-ignore
          resultsSummary.best_pair = formatPairMetrics(resultsSummary.best_pair);
          // @ts-ignore
          resultsSummary.worst_pair = formatPairMetrics(resultsSummary.worst_pair);
        }

        isSuccess = true; // Mark as success only if parsing is successful
        console.log(`[${taskId}] Successfully parsed result file for strategy: ${strategyName}`);

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
          rawOutputPath: resultPath,
          plotProfitUrl: null, // This can be populated later
          candleDataFile: candleDataFile,
          logs: logs.join('\n'),
          // Populate new metrics
          totalTrades: resultsSummary?.total_trades,
          avgTradeDuration: resultsSummary?.holding_avg_s,
          avgProfit: resultsSummary?.profit_mean,
          totalVolume: resultsSummary?.total_volume,
          profitFactor: resultsSummary?.profit_factor,
          expectancy: resultsSummary?.expectancy,
          sharpe: resultsSummary?.sharpe,
          sortino: resultsSummary?.sortino,
          calmar: resultsSummary?.calmar,
          cagr: resultsSummary?.cagr,
          maxDrawdown: resultsSummary?.max_drawdown_account,
          marketChange: resultsSummary?.market_change,
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
          rawOutputPath: resultPath, // Still save the path for debugging
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
