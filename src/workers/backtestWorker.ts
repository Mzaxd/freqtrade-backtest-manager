import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import { Prisma } from '@prisma/client'
import path from 'path'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function processBacktest(taskId: string) {
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

    const args = [
      ...baseArgs,
      'backtesting',
      '--config', path.posix.join(containerUserDataPath, 'configs', task.config?.filename || ''),
      '--strategy', task.strategy.className,
      '--strategy-path', path.posix.join(containerUserDataPath, 'strategies'),
      '--timerange', `${task.timerangeStart?.toISOString().split('T')[0]}-${task.timerangeEnd?.toISOString().split('T')[0]}`,
      '--export', 'trades',
      '--export-filename', path.posix.join(containerUserDataPath, 'data', `backtest_${taskId}.json`),
    ]

    console.log(`Executing: ${command} ${args.join(' ')}`);

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

    if (exitCode === 0) {
      // 读取结果文件
      const fs = await import('fs').then(m => m.promises)
      const resultPath = path.join(userDataPath, 'data', `backtest_${taskId}.json`);
      
      let resultsSummary = null
      try {
        const resultData = await fs.readFile(resultPath, 'utf8')
        const result = JSON.parse(resultData)
        
        // 提取关键指标
        resultsSummary = {
          totalTrades: result.trades?.length || 0,
          totalProfit: result.total_profit || 0,
          profitPercent: result.profit_percent || 0,
          winRate: result.win_rate || 0,
          sharpeRatio: result.sharpe_ratio || 0,
          maxDrawdown: result.max_drawdown || 0,
        }    
      } catch (error) {
        console.error('Failed to read result file:', error)
      }

      // 更新任务状态为 COMPLETED
      await prisma.backtestTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultsSummary: resultsSummary ?? Prisma.JsonNull,
          rawOutputPath: resultPath,
          logs: fullLogs,
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
