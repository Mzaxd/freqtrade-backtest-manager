import { spawn, exec } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import path from 'path'
import { mkdir, writeFile, readdir, stat, readFile } from 'fs/promises'

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

    const logPath = path.join(hyperoptResultsDir, `hyperopt-log-${taskId}.txt`)
    const relativeLogPath = path.relative(userDataPath, logPath)

    // Only update the log path initially. The results path will be updated after the file is created.
    await prisma.hyperoptTask.update({
      where: { id: taskId },
      data: {
        logPath: relativeLogPath,
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
      '--hyperopt-loss', task.lossFunction,
      '--job-workers', '-1', // 使用所有可用CPU核心
      '--print-all',
    ]

    // 如果有时间范围参数，添加到命令中
    if (task.timerange) {
      args.push('--timerange', task.timerange)
    }

    const commandString = `${command} ${args.join(' ')}`
    logs.push(commandString)
    redis.publish(`hyperopt-logs:${taskId}`, commandString + '\n')
    console.log(`Executing: ${commandString}`)

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
      // TODO: Prisma client is likely stale. Run `npx prisma generate` to fix type errors.
      prisma.hyperoptTask.findUnique({ where: { id: taskId } }).then(task => {
        if (task) {
          const updatedLogs = (task.logs || '') + log;
          prisma.hyperoptTask.update({
            where: { id: taskId },
            data: { logs: updatedLogs },
          }).catch(console.error);
        }
      });
      console.log(`[Hyperopt ${taskId}] ${log}`)
    })

    child.stderr.on('data', (data) => {
      const log = data.toString()
      logs.push(log)
      redis.publish(`hyperopt-logs:${taskId}`, log)
      // TODO: Prisma client is likely stale. Run `npx prisma generate` to fix type errors.
      prisma.hyperoptTask.findUnique({ where: { id: taskId } }).then(task => {
        if (task) {
          const updatedLogs = (task.logs || '') + log;
          prisma.hyperoptTask.update({
            where: { id: taskId },
            data: { logs: updatedLogs },
          }).catch(console.error);
        }
      });
      // Treat stderr as regular log output, as freqtrade often prints info there.
      console.log(`[Hyperopt ${taskId}] ${log}`)
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

    const isSuccessful = exitCode === 0 || fullLogs.includes('completed successfully')

    if (isSuccessful) {
      // Find the results file, as freqtrade generates a dynamic name.
      let latestHyperoptFile = ''
      try {
        const files = await readdir(hyperoptResultsDir)
        const resultFiles = files.filter(
          f => f.endsWith('.fthypt') || f.endsWith('.pkl'),
        )

        if (resultFiles.length > 0) {
          let latestMtime = 0
          for (const file of resultFiles) {
            const filePath = path.join(hyperoptResultsDir, file)
            const stats = await stat(filePath)
            // A buffer of 10 minutes to ensure we get a file from the current run
            if (stats.mtimeMs > latestMtime && stats.mtimeMs > (Date.now() - 10 * 60 * 1000)) {
              latestMtime = stats.mtimeMs
              latestHyperoptFile = filePath
            }
          }
        }
      } catch (findFileError) {
        console.error('Error finding hyperopt results file:', findFileError)
      }

      if (!latestHyperoptFile) {
        console.error('Could not find a recently created .fthypt or .pkl file.')
      }
      
      const relativeResultsPath = latestHyperoptFile
        ? path.relative(userDataPath, latestHyperoptFile)
        : null;
      
      let bestResult: any = null;

      if (latestHyperoptFile) {
        try {
          // 使用python脚本将pickle文件转换为JSON
          const scriptPath = path.resolve(process.cwd(), 'scripts', 'pickle_to_json.py');
          const jsonOutput = await new Promise<string>((resolve, reject) => {
            exec(`python ${scriptPath} "${latestHyperoptFile}"`, (error, stdout, stderr) => {
              if (error) {
                console.error('Python script error:', stderr);
                return reject(error);
              }
              resolve(stdout);
            });
          });

          const results = JSON.parse(jsonOutput);
          
          if (Array.isArray(results) && results.length > 0) {
            // 假设loss越小越好
            bestResult = results.reduce((prev, current) => (prev.loss < current.loss) ? prev : current);
          }
        } catch (e) {
          console.error('Failed to parse hyperopt results file:', e);
        }
      }

      // 更新任务状态为 COMPLETED
      await prisma.hyperoptTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          resultsPath: relativeResultsPath,
          bestResult: bestResult ? JSON.stringify(bestResult) : undefined,
          logs: fullLogs,
        },
      })
    } else {
      // 更新任务状态为 FAILED
      await prisma.hyperoptTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          logs: fullLogs,
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