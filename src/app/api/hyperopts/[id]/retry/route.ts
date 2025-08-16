import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const hyperoptId = params.id

    // First, find the existing task to get the log path
    const existingTask = await prisma.hyperoptTask.findUnique({
      where: { id: hyperoptId },
    })

    if (existingTask?.logPath) {
      try {
        await unlink(existingTask.logPath)
        console.log(`[DEBUG] Deleted old log file: ${existingTask.logPath}`)
      } catch (error: any) {
        // If the file doesn't exist, we can ignore the error
        if (error.code !== 'ENOENT') {
          console.warn(`[DEBUG] Could not delete old log file: ${existingTask.logPath}`, error)
        }
      }
    }

    // 重置任务状态为 PENDING
    const hyperopt = await prisma.hyperoptTask.update({
      where: { id: hyperoptId },
      data: {
        status: 'PENDING',
        bestResult: Prisma.JsonNull,
        resultsPath: null,
        logPath: null,
        logs: '',
      },
      include: { strategy: true, config: true }
    })

    // 添加到队列
    const { hyperoptQueue } = await import('@/lib/queue')
    await hyperoptQueue.add('hyperopt', {
      taskId: hyperopt.id,
    })

    return NextResponse.json(hyperopt)
  } catch (error) {
    console.error('[DEBUG] 重试 Hyperopt 任务失败:', error)
    return NextResponse.json(
      {
        error: 'Failed to retry hyperopt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}