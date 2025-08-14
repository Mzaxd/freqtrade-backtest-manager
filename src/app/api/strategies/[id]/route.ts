import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const getStrategiesPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || join(process.cwd(), 'ft_user_data');
  return join(userDataPath, 'strategies');
};

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const strategyId = parseInt(id)
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
    const strategiesPath = getStrategiesPath();
    const filepath = join(strategiesPath, strategy.filename);
    if (existsSync(filepath)) {
      try {
        await unlink(filepath)
      } catch (fileError) {
        console.error(`策略文件删除失败: ${filepath}`, fileError)
        // 这是一个致命错误，应中止操作
        return NextResponse.json(
          { error: '删除策略文件时发生错误' },
          { status: 500 }
        )
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