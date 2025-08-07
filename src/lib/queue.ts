import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

console.log('[DEBUG] 正在连接 Redis...')
console.log('[DEBUG] REDIS_URL:', process.env.REDIS_URL || 'redis://localhost:6379')

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// 测试 Redis 连接
connection.on('connect', () => {
  console.log('[DEBUG] Redis 连接成功')
})

connection.on('error', (error) => {
  console.error('[DEBUG] Redis 连接失败:', error)
})

export const backtestQueue = new Queue('backtest', {
  connection,
})

export const dataDownloadQueue = new Queue('dataDownload', {
  connection,
})

export const createWorker = (queueName: string, processor: (job: any) => Promise<void>) => {
  return new Worker(queueName, processor, {
    connection,
  })
}
