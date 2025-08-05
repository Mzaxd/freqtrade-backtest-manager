import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { backtestQueue } from '@/lib/queue'
import { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const backtest = await prisma.backtestTask.findUnique({
      where: { id: params.id },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: 'Backtest not found' },
        { status: 404 },
      )
    }

    if (backtest.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Only failed backtests can be retried' },
        { status: 400 },
      )
    }

    // Reset the backtest status
    const updatedBacktest = await prisma.backtestTask.update({
      where: { id: params.id },
      data: {
        status: 'PENDING',
        completedAt: null,
        resultsSummary: Prisma.JsonNull,
        rawOutputPath: null,
        logs: null,
      },
    })

    // Add the job back to the queue
    await backtestQueue.add('process-backtest', { taskId: updatedBacktest.id })

    return NextResponse.json(updatedBacktest)
  } catch (error) {
    console.error('Failed to retry backtest:', error)
    return NextResponse.json(
      { error: 'Failed to retry backtest' },
      { status: 500 },
    )
  }
}