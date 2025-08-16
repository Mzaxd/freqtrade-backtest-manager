import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const hyperopt = await prisma.hyperoptTask.findUnique({
      where: { id: params.id },
      include: {
        strategy: true,
        config: true,
        generatedBacktests: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    })

    if (!hyperopt) {
      return NextResponse.json({ error: 'Hyperopt task not found' }, { status: 404 })
    }

    return NextResponse.json(hyperopt)
  } catch (error) {
    console.error('[DEBUG] 获取 Hyperopt 任务详情失败:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch hyperopt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // 删除相关的生成回测任务
    await prisma.backtestTask.deleteMany({
      where: { sourceHyperoptTaskId: params.id }
    })

    // 删除 Hyperopt 任务
    await prisma.hyperoptTask.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DEBUG] 删除 Hyperopt 任务失败:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete hyperopt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // 重置任务状态为 PENDING
    const hyperopt = await prisma.hyperoptTask.update({
      where: { id: params.id },
      data: { 
        status: 'PENDING',
        bestResult: undefined,
        resultsPath: undefined,
        logPath: undefined
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