import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hyperoptQueue } from '@/lib/queue'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId')

    const whereClause: { strategyId?: number } = {}
    if (strategyId) {
      whereClause.strategyId = parseInt(strategyId, 10)
    }
    
    console.log('[DEBUG] 尝试获取 Hyperopt 任务列表...')
    const hyperopts = await prisma.hyperoptTask.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
    })
    console.log('[DEBUG] 成功获取 Hyperopt 任务列表，数量:', hyperopts.length)
    return NextResponse.json(hyperopts)
  } catch (error) {
    console.error('[DEBUG] 获取 Hyperopt 任务列表失败:', error)
    console.error('[DEBUG] 错误详情:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch hyperopts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      strategyId,
      configId,
      epochs,
      spaces,
      lossFunction,
      timerange,
      jobWorkers
    } = body

    if (!strategyId || !configId || !epochs || !spaces || !lossFunction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 验证策略和配置是否存在
    const [strategy, config] = await Promise.all([
      prisma.strategy.findUnique({
        where: { id: parseInt(strategyId, 10) },
      }),
      prisma.config.findUnique({
        where: { id: parseInt(configId, 10) },
      }),
    ])

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    // 创建 Hyperopt 任务
    const hyperopt = await prisma.hyperoptTask.create({
      data: {
        strategyId: parseInt(strategyId),
        configId: parseInt(configId),
        epochs: parseInt(epochs),
        spaces,
        lossFunction,
        timerange: timerange || undefined,
        jobWorkers: jobWorkers ? parseInt(jobWorkers) : undefined,
        status: 'PENDING',
      },
      include: {
        strategy: true,
        config: true,
      },
    })

    // 添加到队列
    await hyperoptQueue.add('hyperopt', {
      taskId: hyperopt.id,
    })

    return NextResponse.json(hyperopt)
  } catch (error) {
    console.error('[DEBUG] 创建 Hyperopt 任务失败:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create hyperopt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}