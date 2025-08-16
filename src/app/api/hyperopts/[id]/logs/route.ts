import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const hyperopt = await prisma.hyperoptTask.findUnique({
      where: { id: params.id },
    })

    if (!hyperopt) {
      return NextResponse.json({ error: 'Hyperopt task not found' }, { status: 404 })
    }

    if (!hyperopt.logPath) {
      return NextResponse.json({ logs: '' })
    }

    try {
      const logs = await readFile(hyperopt.logPath, 'utf-8')
      return NextResponse.json({ logs })
    } catch (fileError) {
      console.warn('[DEBUG] 无法读取日志文件:', fileError)
      return NextResponse.json({ logs: '' })
    }
  } catch (error) {
    console.error('[DEBUG] 获取 Hyperopt 日志失败:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch hyperopt logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}