import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { backtestQueue } from '@/lib/queue'
import { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const backtest = await prisma.backtestTask.findUnique({
      where: { id },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: 'Backtest not found' },
        { status: 404 },
      )
    }

    // Reset the backtest status
    const updatedBacktest = await prisma.backtestTask.update({
      where: { id: id },
      data: {
        status: 'PENDING',
        completedAt: null,
        resultsSummary: Prisma.JsonNull,
        rawOutputPath: null,
        logs: '',
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