import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { plotQueue } from '@/lib/queue'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = id
  console.log(`[PLOT API] Received request for task: ${taskId}`);

  try {
    const task = await prisma.backtestTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return new NextResponse(JSON.stringify({ error: 'Backtest task not found' }), { status: 404 })
    }

    if (!task.rawOutputPath) {
      return new NextResponse(JSON.stringify({ error: 'Backtest result file not found' }), { status: 400 })
    }

    await plotQueue.add('generate-plot', { taskId });

    return NextResponse.json({ message: 'Plot generation task queued' })
  } catch (error) {
    console.error(`[PLOT API] CRITICAL ERROR queueing plot for task ${taskId}:`, error);
    return new NextResponse(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to queue plot generation' }),
        { status: 500 }
    )
  }
}