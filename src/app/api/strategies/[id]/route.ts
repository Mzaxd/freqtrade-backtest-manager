import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const strategyId = parseInt(params.id)
  if (isNaN(strategyId)) {
    return NextResponse.json({ error: '无效的策略 ID' }, { status: 400 })
  }

  try {
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      include: { backtestTasks: true },
    })

    if (!strategy) {
      return NextResponse.json({ error: '策略未找到' }, { status: 404 })
    }

    if (strategy.backtestTasks.length > 0) {
      return NextResponse.json(
        {
          error: `无法删除策略：它已关联 ${strategy.backtestTasks.length} 个回测任务`,
        },
        { status: 400 }
      )
    }

    // 删除策略文件
    const filepath = join('strategies', strategy.filename)
    if (existsSync(filepath)) {
      try {
        await unlink(filepath)
      } catch (fileError) {
        console.warn(`策略文件删除失败: ${filepath}`, fileError)
        // 非致命错误，继续执行
      }
    }

    // 从数据库删除策略
    await prisma.strategy.delete({ where: { id: strategyId } })

    return NextResponse.json({ message: '策略删除成功' })
  } catch (error) {
    console.error('删除策略时发生错误:', error)
    return NextResponse.json(
      { error: '删除策略时发生服务器内部错误' },
      { status: 500 }
    )
  }
}