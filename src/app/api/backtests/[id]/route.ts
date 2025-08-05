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

export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backtest = await prisma.backtestTask.findUnique({
      where: { id: params.id },
    })

    if (!backtest) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.backtestTask.delete({
      where: { id: params.id },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Backtest not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete backtest' },
      { status: 500 }
    )
  }
}
