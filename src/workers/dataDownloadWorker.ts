import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import path from 'path'
import fs from 'fs/promises'
import { tableFromIPC } from 'apache-arrow'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

async function getFeatherTimeRange(filePath: string): Promise<{ startTime?: Date; endTime?: Date }> {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, 'read_feather_timerange.py');
    const child = spawn('python', [pythonScriptPath, filePath]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve({
            startTime: result.startTime ? new Date(result.startTime) : undefined,
            endTime: result.endTime ? new Date(result.endTime) : undefined,
          });
        } catch (e) {
          reject(new Error(`Failed to parse python script output: ${stdout}`));
        }
      } else {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      }
    });
  });
}

async function scanAndSyncData(exchange: string, marketType: string) {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data');
  const dataPath = path.join(userDataPath, 'data', exchange);

  try {
    const files = await fs.readdir(dataPath);
    for (const file of files) {
      if ((file.endsWith('.json') || file.endsWith('.feather')) && !file.endsWith('.meta.json')) {
        const [pair, timeframe] = file.replace('.json', '').replace('.feather', '').split('-');
        const pairPath = pair.replace('_', '/');
        const fullPath = path.join(dataPath, file);

        let startTime: Date | undefined;
        let endTime: Date | undefined;

        try {
          if (file.endsWith('.json')) {
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(fileContent);
            if (data.length > 0) {
              startTime = new Date(data[0][0]);
              endTime = new Date(data[data.length - 1][0]);
            }
          } else if (file.endsWith('.feather')) {
            const timeRange = await getFeatherTimeRange(fullPath);
            startTime = timeRange.startTime;
            endTime = timeRange.endTime;
          }
        } catch (e) {
          console.error(`Failed to parse time range from ${file}:`, e);
        }
        
        await prisma.marketData.upsert({
          where: {
            exchange_pair_timeframe_marketType: {
              exchange,
              pair: pairPath,
              timeframe,
              marketType
            }
          },
          update: {
            status: 'available',
            filePath: fullPath,
            startTime,
            endTime
          },
          create: {
            exchange,
            pair: pairPath,
            timeframe,
            marketType,
            status: 'available',
            filePath: fullPath,
            startTime,
            endTime
          },
        });
      }
    }
  } catch (error) {
    console.error(`Failed to scan data for ${exchange}:`, error);
  }
}

export async function processDataDownload(jobId: string) {
  try {
    await prisma.dataDownloadJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING' },
    })

    const job = await prisma.dataDownloadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    const logs: string[] = [];
    
    const commandWithArgs = (process.env.FREQTRADE_PATH || 'freqtrade').split(' ')  
    const command = commandWithArgs[0]
    const baseArgs = commandWithArgs.slice(1)

    const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data');

    const args = [
      ...baseArgs,
      'download-data',
      '--exchange', job.exchange,
      '--pairs', ...job.pairs,
      '--timeframes', ...job.timeframes,
    ]

    if (job.timerangeStart && job.timerangeEnd) {
      const format = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
      args.push('--timerange', `${format(job.timerangeStart)}-${format(job.timerangeEnd)}`);
    }

    console.log(`Executing: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd: userDataPath,
      env: { ...process.env },
    })

    child.stdout.on('data', (data) => {
      const log = data.toString()
      logs.push(log)
      redis.publish(`logs:${jobId}`, log)
      console.log(`[${jobId}] ${log}`)
    });

    child.stderr.on('data', (data) => {
      const log = data.toString()
      logs.push(log)
      redis.publish(`logs:${jobId}`, log)
      console.log(`[${jobId}] ${log}`)
    })

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', resolve)
    })

    const fullLogs = logs.join('\n')

    if (exitCode === 0) {
      await prisma.dataDownloadJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          logs: fullLogs,
        },
      })
      // Sync the downloaded data with the database
      await scanAndSyncData(job.exchange, job.marketType);
    } else {
      await prisma.dataDownloadJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          logs: fullLogs,
        },
      })
    }
  } catch (error) {
    console.error('Error processing data download:', error)
    await prisma.dataDownloadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        logs: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}