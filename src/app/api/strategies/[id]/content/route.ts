import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'

const getStrategiesPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || join(process.cwd(), 'ft_user_data');
  return join(userDataPath, 'strategies');
};

export async function GET(
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
    })

    if (!strategy) {
      return NextResponse.json({ error: '策略未找到' }, { status: 404 })
    }

    // 读取策略文件内容
    const strategiesPath = getStrategiesPath();
    const filepath = join(strategiesPath, strategy.filename);
    
    try {
      const content = await readFile(filepath, 'utf-8');
      return NextResponse.json({
        id: strategy.id,
        filename: strategy.filename,
        className: strategy.className,
        description: strategy.description,
        content,
      });
    } catch (fileError) {
      console.error(`读取策略文件失败: ${filepath}`, fileError);
      return NextResponse.json(
        { error: '读取策略文件失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('获取策略内容失败:', error);
    return NextResponse.json(
      { error: '获取策略内容失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const strategyId = parseInt(id)
  
  if (isNaN(strategyId)) {
    return NextResponse.json({ error: '无效的策略 ID' }, { status: 400 })
  }

  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: '策略内容不能为空' }, { status: 400 })
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    })

    if (!strategy) {
      return NextResponse.json({ error: '策略未找到' }, { status: 404 })
    }

    // 从新内容中提取类名
    const match = content.match(/class\s+([a-zA-Z0-9_]+)\s*\(/);
    const newClassName = match ? match[1] : null;

    if (!newClassName) {
      return NextResponse.json(
        { error: '无法从策略内容中解析出类名' },
        { status: 400 }
      );
    }

    // 更新策略文件
    const strategiesPath = getStrategiesPath();
    const filepath = join(strategiesPath, strategy.filename);
    
    try {
      // 使用 writeFile 覆盖文件内容
      const { writeFile } = await import('fs/promises');
      await writeFile(filepath, content, 'utf-8');
    } catch (fileError) {
      console.error(`写入策略文件失败: ${filepath}`, fileError);
      return NextResponse.json(
        { error: '写入策略文件失败' },
        { status: 500 }
      );
    }

    // 如果类名发生变化，更新数据库
    if (newClassName !== strategy.className) {
      await prisma.strategy.update({
        where: { id: strategyId },
        data: { className: newClassName },
      });
    }

    return NextResponse.json({
      id: strategy.id,
      filename: strategy.filename,
      className: newClassName,
      description: strategy.description,
      message: '策略保存成功',
    });
  } catch (error) {
    console.error('保存策略失败:', error);
    return NextResponse.json(
      { error: '保存策略失败' },
      { status: 500 }
    );
  }
}