import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    console.log('[DEBUG] 尝试获取策略列表...')
    const strategies = await prisma.strategy.findMany({
      orderBy: { createdAt: 'desc' },
    })
    console.log('[DEBUG] 成功获取策略列表，数量:', strategies.length)
    return NextResponse.json(strategies)
  } catch (error) {
    console.error('[DEBUG] 获取策略列表失败:', error)
    console.error('[DEBUG] 错误详情:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch strategies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // 确保策略目录存在
    await mkdir('strategies', { recursive: true })

    // 保存文件
    const filename = file.name
    const filepath = join('strategies', filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // 从文件名提取类名（假设文件名格式为 strategy_name.py）
    const className = filename.replace('.py', '').split('_').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('')

    // 保存到数据库
    const strategy = await prisma.strategy.create({
      data: {
        filename,
        className,
        description,
      },
    })

    return NextResponse.json(strategy)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload strategy' },
      { status: 500 }
    )
  }
}
