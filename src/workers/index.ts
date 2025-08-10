import { createWorker } from '@/lib/queue'
import { processBacktest } from './backtestWorker'
import { processDataDownload } from './dataDownloadWorker'
import { processPlot } from './plotWorker'

console.log('Starting worker process...')

const backtestWorker = createWorker('backtest', async (job) => {
  const { taskId } = job.data
  console.log(`Processing backtest task ${taskId}`)
  await processBacktest(taskId)
})

const dataDownloadWorker = createWorker('dataDownload', async (job) => {
  const { jobId } = job.data
  console.log(`Processing data download job ${jobId}`)
  await processDataDownload(jobId)
})

const plotWorker = createWorker('plot', async (job) => {
  console.log(`Processing plot job ${job.id}`)
  await processPlot(job)
})

const workers = [backtestWorker, dataDownloadWorker, plotWorker]

workers.forEach((worker) => {
  const workerName = worker.name
  worker.on('completed', (job) => {
    console.log(`${workerName} job ${job.id} completed successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`${workerName} job ${job?.id} failed:`, err)
  })
})


// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down workers gracefully...')
  await Promise.all(workers.map(w => w.close()))
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
