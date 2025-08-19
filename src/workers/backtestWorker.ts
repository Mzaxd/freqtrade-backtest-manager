import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import { Prisma } from '@prisma/client'
import path from 'path'
import { promises as fs } from 'fs'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

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
  const retryDelay = 2000; // 2 seconds, to be safe

  for (let i = 0; i < maxRetries; i++) {
    try {
      const files = await fs.readdir(resultsDir);
      // Freqtrade can sometimes add suffixes before the .json, so we look for files starting with the base name.
      const taskFilePrefix = `backtest-result-cli-${taskId}`;
      const matchingFiles = files.filter(file => file.startsWith(taskFilePrefix) && file.endsWith('.json'));

      if (matchingFiles.length > 0) {
        // Prefer the .meta.json file as it contains the summary statistics.
        const metaFile = matchingFiles.find(file => file.endsWith('.meta.json'));
        if (metaFile) {
          const filePath = path.join(resultsDir, metaFile);
          console.log(`Found result file: ${filePath}`);
          return filePath;
        }
        
        // Fallback to the first matching file if no .meta.json is found.
        // This could be the trades file.
        const anyJsonFile = matchingFiles[0];
        const filePath = path.join(resultsDir, anyJsonFile);
        console.log(`Found result file (fallback, non-meta): ${filePath}`);
        return filePath;
      }
    } catch (error: any) {
      // ENOENT means the directory doesn't exist, which is a valid case if no results have ever been generated.
      if (error.code !== 'ENOENT') {
        console.error(`Error reading results directory (attempt ${i + 1}/${maxRetries}):`, error);
      }
    }
    
    if (i < maxRetries - 1) {
      console.log(`Result file for task ${taskId} not found. Retrying in ${retryDelay}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.warn(`No result file found for task ${taskId} in ${resultsDir} after ${maxRetries} retries.`);
  const possibleFiles = [
    `backtest-result-cli-${taskId}.json`,
    `backtest-result-cli-${taskId}.meta.json`
  ];
  console.warn(`Expected files starting with: ${possibleFiles.join(' or ')}`);
  return null;
}

export async function processBacktest(taskId: string, overrideParams?: any) {
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
      '--config', path.posix.join(containerUserDataPath, 'configs', task.config?.filename || ''),
      '--strategy', task.strategy.className,
      '--strategy-path', path.posix.join(containerUserDataPath, 'strategies'),
      '--timerange', `${task.timerangeStart?.toISOString().split('T')[0].replace(/-/g, '')}-${task.timerangeEnd?.toISOString().split('T')[0].replace(/-/g, '')}`,
      '--export', 'trades,meta',
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
      const originalConfig = task.config?.data as Record<string, any> || {}
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
    let resultsSummary = null;
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

        let result;
        try {
          result = JSON.parse(resultData);
        } catch (parseError) {
          console.error(`Failed to parse JSON from result file: ${parseError}`);
          console.error(`File content preview: ${resultData.substring(0, 500)}...`);
          throw new Error(`Invalid JSON in result file: ${(parseError as Error).message}`);
        }

        // The strategy name is the first key in the result object.
        const strategyName = Object.keys(result)[0];
        if (!strategyName) {
          throw new Error("Strategy name not found in result object.");
        }
        const strategyResult = result[strategyName];

        // Debug: Log the structure of the result
        console.log(`[${taskId}] Result file structure keys:`, Object.keys(strategyResult));
        console.log(`[${taskId}] Sample result data:`, JSON.stringify(strategyResult, null, 2).substring(0, 500));

        // Check if this is a meta.json file (contains summary statistics)
        if (strategyResult.trades && !strategyResult.total_trades) {
          console.log(`[${taskId}] Detected trades-only file, looking for meta.json...`);
          // This is a trades file, we need to find the meta.json file
          const metaFilePath = resultPath.replace('.json', '.meta.json');
          if (await fileExists(metaFilePath)) {
            console.log(`[${taskId}] Found meta.json file: ${metaFilePath}`);
            const metaData = await fs.readFile(metaFilePath, 'utf8');
            const metaResult = JSON.parse(metaData);
            const metaStrategyName = Object.keys(metaResult)[0];
            if (metaStrategyName && metaResult[metaStrategyName]) {
              // Use the meta.json for summary statistics and keep trades data separate
              resultsSummary = metaResult[metaStrategyName];
              console.log(`[${taskId}] Using meta.json for summary statistics`);
            }
          } else {
            console.log(`[${taskId}] No meta.json file found, calculating summary from trades...`);
            // Calculate summary statistics from trades
            const trades = strategyResult.trades || [];
            const wins = trades.filter((t: any) => t.profit_pct > 0).length;
            const losses = trades.filter((t: any) => t.profit_pct < 0).length;
            const draws = trades.filter((t: any) => t.profit_pct === 0).length;
            const totalProfit = trades.reduce((sum: number, t: any) => sum + t.profit_abs, 0);
            const profitTotal = trades.reduce((sum: number, t: any) => sum + t.profit_pct, 0);
            
            resultsSummary = {
              total_trades: trades.length,
              wins,
              losses,
              draws,
              profit_total: profitTotal / 100, // Convert percentage to decimal
              profit_total_abs: totalProfit,
              stake_currency: 'USDT', // Default, should be from config
              avg_duration: 'N/A',
              best_pair: 'N/A',
              worst_pair: 'N/A',
            };
            console.log(`[${taskId}] Calculated summary from trades:`, resultsSummary);
          }
        } else {
          // This is already a meta.json file or contains summary statistics
          resultsSummary = strategyResult;
          console.log(`[${taskId}] Using existing summary statistics from result file`);
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
    if (isSuccess && !hasErrorInLog && task.timerangeStart && task.timerangeEnd) {
      // 从交易中获取交易对信息
      const trades = await prisma.trade.findMany({
        where: { backtestTaskId: taskId },
        take: 1,
      });
      
      if (trades.length > 0) {
        const pair = trades[0].pair;
        const timeframe = task.timeframe || '5m';
        const exchange = 'binance'; // 默认交易所，可以从配置中获取
        
        candleDataFile = await renameDataFileForBacktest(
          exchange,
          pair,
          timeframe,
          task.timerangeStart,
          task.timerangeEnd,
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
  } catch (error) {
    console.error('Error processing backtest:', error)
    
    // 更新任务状态为 FAILED
    await prisma.backtestTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        logs: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
