import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    console.log('[DEBUG] 尝试获取配置列表...')
    const configs = await prisma.config.findMany({
      orderBy: { createdAt: 'desc' },
    })
    console.log('[DEBUG] 成功获取配置列表，数量:', configs.length)
    return NextResponse.json(configs)
  } catch (error) {
    console.error('[DEBUG] 获取配置列表失败:', error)
    console.error('[DEBUG] 错误详情:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch configs',
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

    // 确保配置目录存在
    await mkdir('configs', { recursive: true })

    // 保存文件
    const filename = file.name
    const filepath = join('configs', filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // 保存到数据库
    const config = await prisma.config.create({
      data: {
        filename,
        description,
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload config' },
      { status: 500 }
    )
  }
}
