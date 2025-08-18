import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const getStrategiesPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || join(process.cwd(), 'ft_user_data');
  return join(userDataPath, 'strategies');
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const strategyId = parseInt(id, 10)
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    })

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const filePath = join(getStrategiesPath(), strategy.filename)
    const content = await readFile(filePath, 'utf-8')

    return NextResponse.json({ success: true, data: { content } })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to read strategy file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const strategyId = parseInt(id, 10)
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    })

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const filePath = join(getStrategiesPath(), strategy.filename)
    await writeFile(filePath, content, 'utf-8')

    return NextResponse.json({ success: true, message: 'Strategy updated successfully' })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to write strategy file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}