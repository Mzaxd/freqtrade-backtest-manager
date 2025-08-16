import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function processHyperopt(taskId: string) {
  try {
    // 更新任务状态为 RUNNING
    await prisma.hyperoptTask.update({
      where: { id: taskId },
      data: { status: 'RUNNING' },
    })

    // 获取任务详情
    const task = await prisma.hyperoptTask.findUnique({
      where: { id: taskId },
      include: { strategy: true, config: true },
    })

    if (!task) {
      throw new Error(`Hyperopt task ${taskId} not found`)
    }

    const logs: string[] = []
    
    // 构建 freqtrade hyperopt 命令
    const commandWithArgs = (process.env.FREQTRADE_PATH || 'freqtrade').split(' ')  
    const command = commandWithArgs[0]
    const baseArgs = commandWithArgs.slice(1)

    const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data')
    const containerUserDataPath = process.env.FREQTRADE_CONTAINER_USER_DATA_PATH || '/freqtrade/user_data'

    // 创建输出目录
    const hyperoptResultsDir = path.join(userDataPath, 'hyperopt_results')
    await mkdir(hyperoptResultsDir, { recursive: true })

    const resultsPath = path.join(hyperoptResultsDir, `hyperopt-result-${taskId}.pickle`)
    const logPath = path.join(hyperoptResultsDir, `hyperopt-log-${taskId}.txt`)

    // 更新任务路径信息
    await prisma.hyperoptTask.update({
      where: { id: taskId },
      data: {
        resultsPath,
        logPath,
      },
    })

    const args = [
      ...baseArgs,
      'hyperopt',
      '--config', path.posix.join(containerUserDataPath, 'configs', task.config?.filename || ''),
      '--strategy', task.strategy.className,
      '--strategy-path', path.posix.join(containerUserDataPath, 'strategies'),
      '--epochs', task.epochs.toString(),
      '--spaces', task.spaces,
      '--loss-function', task.lossFunction,
      '--hyperopt-jobs', '-1', // 使用所有可用CPU核心
      '--print-all',
    ]

    // 如果有时间范围参数，添加到命令中
    if (task.timerange) {
      args.push('--timerange', task.timerange)
    }

    console.log(`Executing: ${command} ${args.join(' ')}`)

    // 启动子进程
    const child = spawn(command, args, {
      cwd: userDataPath,
      env: { ...process.env },
    })

    // 实时日志处理
    child.stdout.on('data', (data) => {
      const log = data.toString()
      logs.push(log)
      redis.publish(`hyperopt-logs:${taskId}`, log)
      console.log(`[Hyperopt ${taskId}] ${log}`)
    })

    child.stderr.on('data', (data) => {
      const log = data.toString()
      logs.push(log)
      redis.publish(`hyperopt-logs:${taskId}`, log)
      console.error(`[Hyperopt ${taskId}] ERROR: ${log}`)
    })

    // 等待进程完成
    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', resolve)
    })

    const fullLogs = logs.join('\n')

    // 保存日志文件
    try {
      await writeFile(logPath, fullLogs)
    } catch (logError) {
      console.error(`Failed to write log file: ${logError}`)
    }

    if (exitCode === 0) {
      // 解析结果以提取最佳参数
      let bestResult = null
      
      // 从日志中提取最佳结果
      const bestMatch = fullLogs.match(/Best result:\s*\n\s*Loss:\s*([0-9.]+)[\s\S]*?params:\s*({[\s\S]*?})/)
      if (bestMatch) {
        try {
          const loss = parseFloat(bestMatch[1])
          const paramsStr = bestMatch[2]
          
          // 尝试解析参数
          const params = JSON.parse(paramsStr)
          
          bestResult = {
            loss,
            params,
            timestamp: new Date().toISOString(),
          }
        } catch (parseError) {
          console.error('Failed to parse best result from logs:', parseError)
        }
      }

      // 更新任务状态为 COMPLETED
      await prisma.hyperoptTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          bestResult: bestResult ? JSON.stringify(bestResult) : undefined,
        },
      })
    } else {
      // 更新任务状态为 FAILED
      await prisma.hyperoptTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
        },
      })
    }
  } catch (error) {
    console.error('Error processing hyperopt:', error)
    
    // 更新任务状态为 FAILED
    await prisma.hyperoptTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
      },
    })
  }
}