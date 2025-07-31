import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backtest = await prisma.backtestTask.findUnique({
      where: { id: params.id },
      include: {
        strategy: true,
        config: true,
      },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: 'Backtest not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(backtest)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch backtest' },
      { status: 500 }
    )
  }
}
