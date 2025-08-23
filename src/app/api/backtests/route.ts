import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { backtestQueue } from '@/lib/queue'
import { z } from 'zod'
import { ConfigData, APIErrorResponse } from '@/types/chart'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategyId')

    const whereClause: { strategyId?: number } = {}
    if (strategyId) {
      whereClause.strategyId = parseInt(strategyId, 10)
    }

    console.log('[DEBUG] 尝试获取回测任务列表...')
    const backtests = await prisma.backtestTask.findMany({
      where: whereClause,
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

const CreateBacktestRequestSchema = z.object({
  name: z.string().min(1, 'Backtest name is required'),
  strategyId: z.number().int().positive('Strategy ID must be a positive integer'),
  configId: z.number().int().positive('Config ID must be a positive integer'),
  timerangeStart: z.string().datetime().optional().or(z.literal('')),
  timerangeEnd: z.string().datetime().optional().or(z.literal('')),
  overrideParams: z.record(z.string(), z.any()).optional(),
  sourceHyperoptTaskId: z.string().uuid().optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateBacktestRequestSchema.parse(body);
    const { name, strategyId, configId, timerangeStart, timerangeEnd, overrideParams, sourceHyperoptTaskId } = validatedData;

    // 验证配置是否存在并包含 timeframe
    const config = await prisma.config.findUnique({
      where: { id: configId },
    });

    if (!config) {
      const errorResponse: APIErrorResponse = {
        error: 'Configuration not found',
        type: 'NOT_FOUND',
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const timeframe = (config.data as ConfigData)?.timeframe;
    if (!timeframe) {
      const errorResponse: APIErrorResponse = {
        error: 'Configuration is missing the required "timeframe" field.',
        type: 'VALIDATION_ERROR',
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 创建回测任务
    const backtest = await prisma.backtestTask.create({
      data: {
        name,
        status: 'PENDING',
        strategyId: strategyId,
        configId: configId,
        timeframe,
        timerangeStart: timerangeStart ? new Date(timerangeStart) : null,
        timerangeEnd: timerangeEnd ? new Date(timerangeEnd) : null,
        sourceHyperoptTaskId,
      },
      include: {
        strategy: true,
        config: true,
      },
    })

    // 添加到队列
    await backtestQueue.add('backtest', {
      taskId: backtest.id,
      overrideParams,
    })

    return NextResponse.json(backtest)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const errorResponse: APIErrorResponse = {
        error: 'Invalid request payload',
        details: error.issues,
        type: 'VALIDATION_ERROR',
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    console.error('Failed to create backtest:', error);
    const errorResponse: APIErrorResponse = {
      error: 'Failed to create backtest',
      details: error.message || 'Unknown error',
      type: 'INTERNAL_ERROR',
      timestamp: new Date(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
