import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import { Prisma } from '@prisma/client'
import path from 'path'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

async function findLatestBacktestResult(resultsDir: string): Promise<string | null> {
  const fs = await import('fs').then(m => m.promises);
  const fsSync = await import('fs');
  try {
    const files = await fs.readdir(resultsDir);
    const jsonFiles = files
      .filter(f => f.startsWith('backtest-result-') && f.endsWith('.zip'))
      .map(file => ({ file, mtime: fsSync.statSync(path.join(resultsDir, file)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (jsonFiles.length === 0) {
      return null;
    }
    return path.join(resultsDir, jsonFiles[0].file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`Backtest results directory not found: ${resultsDir}`);
      return null;
    }
    throw error;
  }
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

    // 基础参数
    const args = [
      ...baseArgs,
      'backtesting',
      '--config', path.posix.join(containerUserDataPath, 'configs', task.config?.filename || ''),
      '--strategy', task.strategy.className,
      '--strategy-path', path.posix.join(containerUserDataPath, 'strategies'),
      '--timerange', `${task.timerangeStart?.toISOString().split('T')[0].replace(/-/g, '')}-${task.timerangeEnd?.toISOString().split('T')[0].replace(/-/g, '')}`,
      '--export', 'trades',
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
      console.error(`[${taskId}] ERROR: ${log}`)
    })

    // 等待进程完成
    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', resolve)
    })

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

    if (exitCode === 0) {
      const backtestResultsDir = path.join(userDataPath, 'backtest_results');
      const resultPath = await findLatestBacktestResult(backtestResultsDir);
      
      let resultsSummary = null
      let plotProfitUrl = null

      if (resultPath) {
        try {
          const fs = await import('fs').then(m => m.promises)
          const resultData = await fs.readFile(resultPath, 'utf8')
          const result = JSON.parse(resultData)
          
          // The result is nested under the strategy name.
          const strategyName = Object.keys(result.strategy)[0];
          const strategyResult = result.strategy[strategyName];
          
          // Store the entire strategy result object
          resultsSummary = strategyResult;
          
        } catch (error) {
          console.error('Failed to read or process result file:', error)
          logs.push(`\nError processing result file: ${(error as Error).message}`);
        }
      } else {
        logs.push('\nWarning: Could not find backtest result file.');
      }

      // 更新任务状态为 COMPLETED
      await prisma.backtestTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultsSummary: resultsSummary ?? Prisma.JsonNull,
          rawOutputPath: resultPath,
          plotProfitUrl: null,
          logs: logs.join('\n'),
        },
      })
    } else {
      // 更新任务状态为 FAILED
      await prisma.backtestTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          logs: fullLogs,
        },
      })
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
