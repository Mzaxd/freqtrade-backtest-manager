import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import path from 'path'
import fs from 'fs/promises'
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

async function scanAndSyncData(exchange: string, marketType: string) {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data');
  const dataPath = path.join(userDataPath, 'data', exchange);

  try {
    const files = await fs.readdir(dataPath);
    console.log(`Found ${files.length} files in ${dataPath}`);
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('.meta.json')) {
        const [pair, timeframe] = file.replace('.json', '').split('-');
        const pairPath = pair.replace('_', '/');
        const fullPath = path.join(dataPath, file);

        let startTime: Date | undefined;
        let endTime: Date | undefined;
        let parseError: string | null = null;

        try {
          if (file.endsWith('.json')) {
            console.log(`Processing JSON file: ${file}`);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(fileContent);
            console.log(`JSON file ${file} data length: ${data.length}`);
            console.log(`JSON file ${file} first data item:`, JSON.stringify(data[0]));
            
            if (data.length > 0) {
              // 检查数据格式，可能是 [timestamp, ...] 或 { date: timestamp, ... }
              if (Array.isArray(data[0])) {
                startTime = new Date(data[0][0]);
                endTime = new Date(data[data.length - 1][0]);
              } else if (data[0].date !== undefined) {
                startTime = new Date(data[0].date);
                endTime = new Date(data[data.length - 1].date);
              } else {
                parseError = `Unknown JSON data format: ${Object.keys(data[0])}`;
              }
              console.log(`JSON file ${file}: start=${startTime}, end=${endTime}, parseError=${parseError}`);
            } else {
              parseError = 'JSON file is empty';
            }
          }
        } catch (e) {
          parseError = e instanceof Error ? e.message : String(e);
          console.error(`Failed to parse time range from ${file}:`, parseError);
        }
        
        console.log(`Upserting market data for ${exchange}, ${pairPath}, ${timeframe} with times:`, { startTime, endTime });
        
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
        
        console.log(`Successfully upserted market data for ${exchange}, ${pairPath}, ${timeframe}`);
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
    });

    const job = await prisma.dataDownloadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
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

    if (job.format === 'json') {
      args.push('--dl-trades');
      args.push('--data-format-trades', 'json');
    }

    if (job.timerangeStart && job.timerangeEnd) {
      const format = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
      args.push('--timerange', `${format(job.timerangeStart)}-${format(job.timerangeEnd)}`);
    }

    console.log(`Executing: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd: userDataPath,
      env: { ...process.env },
    });

    child.stdout.on('data', (data) => {
      const log = data.toString();
      logs.push(log);
      redis.publish(`logs:${jobId}`, log);
      console.log(`[${jobId}] ${log}`);
    });

    child.stderr.on('data', (data) => {
      const log = data.toString();
      logs.push(log);
      redis.publish(`logs:${jobId}`, log);
      console.log(`[${jobId}] ${log}`);
    });

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', resolve);
    });

    const fullLogs = logs.join('\n');

    if (exitCode === 0) {
      await prisma.dataDownloadJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          logs: fullLogs,
        },
      });
      // Sync the downloaded data with the database
      await scanAndSyncData(job.exchange, job.marketType);
    } else {
      await prisma.dataDownloadJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          logs: fullLogs,
        },
      });
    }
  } catch (error) {
    console.error('Error processing data download:', error);
    await prisma.dataDownloadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        logs: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}