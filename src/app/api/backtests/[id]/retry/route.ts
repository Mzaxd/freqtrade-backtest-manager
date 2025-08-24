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

    // 使用事务来确保数据一致性：先删除旧的交易数据，然后重置回测任务状态
    const updatedBacktest = await prisma.$transaction(async (tx) => {
      // 1. 删除与此回测任务关联的所有旧交易记录
      await tx.trade.deleteMany({
        where: { backtestTaskId: id },
      });

      // 2. 重置回测任务的状态
      const resetBacktest = await tx.backtestTask.update({
        where: { id: id },
        data: {
          status: 'PENDING',
          completedAt: null,
          resultsSummary: Prisma.JsonNull,
          rawOutputPath: null,
          logs: '',
          // 重置所有详细指标
          totalTrades: null,
          avgTradeDuration: null,
          avgProfit: null,
          totalVolume: null,
          profitFactor: null,
          expectancy: null,
          sharpe: null,
          sortino: null,
          calmar: null,
          cagr: null,
          maxDrawdown: null,
          marketChange: null,
        },
      });

      return resetBacktest;
    });

    // 3. 将任务重新添加到队列中
    await backtestQueue.add('process-backtest', { taskId: updatedBacktest.id });

    return NextResponse.json(updatedBacktest)
  } catch (error) {
    console.error('Failed to retry backtest:', error)
    return NextResponse.json(
      { error: 'Failed to retry backtest' },
      { status: 500 },
    )
  }
}