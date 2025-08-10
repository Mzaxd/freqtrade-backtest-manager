import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { backtestQueue } from '@/lib/queue'

export async function GET() {
  try {
    console.log('[DEBUG] 尝试获取回测任务列表...')
    const backtests = await prisma.backtestTask.findMany({
      include: {
        strategy: true,
        config: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    console.log('[DEBUG] 成功获取回测任务列表，数量:', backtests.length)
    return NextResponse.json(backtests)
  } catch (error) {
    console.error('[DEBUG] 获取回测任务列表失败:', error)
    console.error('[DEBUG] 错误详情:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch backtests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, strategyId, configId, timerangeStart, timerangeEnd } = body

    if (!name || !strategyId || !configId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 验证配置是否存在并包含 timeframe
    const config = await prisma.config.findUnique({
      where: { id: parseInt(configId, 10) },
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const timeframe = (config.data as any)?.timeframe;
    if (!timeframe) {
      return NextResponse.json(
        { error: 'Configuration is missing the required "timeframe" field.' },
        { status: 400 }
      );
    }

    // 创建回测任务
    const backtest = await prisma.backtestTask.create({
      data: {
        name,
        status: 'PENDING',
        strategyId: parseInt(strategyId),
        configId: parseInt(configId),
        timeframe,
        timerangeStart: timerangeStart ? new Date(timerangeStart) : null,
        timerangeEnd: timerangeEnd ? new Date(timerangeEnd) : null,
      },
      include: {
        strategy: true,
        config: true,
      },
    })

    // 添加到队列
    await backtestQueue.add('backtest', {
      taskId: backtest.id,
    })

    return NextResponse.json(backtest)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create backtest' },
      { status: 500 }
    )
  }
}
