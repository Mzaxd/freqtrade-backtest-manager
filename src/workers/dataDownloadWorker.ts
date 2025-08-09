import { spawn } from 'child_process'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import path from 'path'
// fs and util are no longer needed after removing scanAndSyncData
// import fs from 'fs/promises'
// import util from 'util'

// const exec = util.promisify(require('child_process').exec)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// getFeatherTimerange is no longer needed
/*
async function getFeatherTimerange(filePath: string): Promise<{ start?: Date; end?: Date; error?: string }> {
  // ... implementation ...
}
*/

// scanAndSyncData is no longer needed and will be replaced by direct logic in processDataDownload
/*
async function scanAndSyncData(exchange: string, marketType: string) {
  // ... implementation ...
}
*/

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

    // Always specify the data format for candles, using the specific ohlcv flag
    args.push('--data-format-ohlcv', job.format || 'json');

    /*
    if (job.format === 'json') {
      // Also download trades if format is json, as feather doesn't support it well for our use case
      args.push('--dl-trades');
      args.push('--data-format-trades', 'json');
    }
    */

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
      
      // New logic: Update MarketData based on job parameters instead of scanning fs
      console.log(`Job ${jobId} completed. Updating MarketData based on job parameters.`);
      const dataPath = path.join(userDataPath, 'data', job.exchange);

      for (const pair of job.pairs) {
        for (const timeframe of job.timeframes) {
          const pairForPath = pair.replace('/', '_');
          const fileName = `${pairForPath}-${timeframe}.${job.format || 'json'}`;
          const fullPath = path.join(dataPath, fileName);

          console.log(`Upserting market data for ${job.exchange}, ${pair}, ${timeframe}`);
          
          await prisma.marketData.upsert({
            where: {
              exchange_pair_timeframe_marketType: {
                exchange: job.exchange,
                pair: pair,
                timeframe: timeframe,
                marketType: job.marketType
              }
            },
            update: {
              status: 'available',
              filePath: fullPath,
              startTime: job.timerangeStart,
              endTime: job.timerangeEnd,
            },
            create: {
              exchange: job.exchange,
              pair: pair,
              timeframe: timeframe,
              marketType: job.marketType,
              status: 'available',
              filePath: fullPath,
              startTime: job.timerangeStart,
              endTime: job.timerangeEnd,
            },
          });
          console.log(`Successfully upserted market data for ${job.exchange}, ${pair}, ${timeframe}`);
        }
      }

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