import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const getStrategiesPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || join(process.cwd(), 'ft_user_data');
  return join(userDataPath, 'strategies');
};

export async function GET() {
  try {
    console.log('[DEBUG] 尝试获取策略列表...');
    const strategies = await prisma.strategy.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            backtestTasks: true,
            hyperoptTasks: true,
          },
        },
      },
    });
    console.log('[DEBUG] 成功获取策略列表，数量:', strategies.length);
    return NextResponse.json({
      success: true,
      data: strategies,
      message: 'Strategies list retrieved successfully',
    });
  } catch (error) {
    console.error('[DEBUG] 获取策略列表失败:', error);
    console.error('[DEBUG] 错误详情:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch strategies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const filename = file.name;

    // 检查数据库中是否已存在同名策略
    const existingStrategy = await prisma.strategy.findUnique({
      where: { filename },
    });

    if (existingStrategy) {
      return NextResponse.json(
        { error: '策略文件已存在', details: 'A strategy with this filename already exists.' },
        { status: 409 }
      );
    }

    const strategiesPath = getStrategiesPath();
    // 确保策略目录存在
    await mkdir(strategiesPath, { recursive: true });

    // 保存文件
    const filepath = join(strategiesPath, filename);
    console.log(`[KILO_CODE_DEBUG] Saving strategy file to: ${filepath}`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 从文件内容中提取类名
    const fileContent = buffer.toString('utf-8');
    const match = fileContent.match(/class\s+([a-zA-Z0-9_]+)\s*\(/);

    if (!match || !match[1]) {
      return NextResponse.json(
        { error: '无法从策略文件中解析出类名。', details: 'Could not parse the class name from the strategy file. Please ensure it follows the format "class YourStrategyName(IStrategy):".' },
        { status: 400 }
      );
    }
    const className = match[1];

    await writeFile(filepath, buffer);

    // 保存到数据库
    const strategy = await prisma.strategy.create({
      data: {
        filename,
        className,
        description,
      },
    });

    return NextResponse.json(strategy);
  } catch (error) {
    console.error('上传策略失败:', error);
    if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('filename')) {
      return NextResponse.json(
        { error: '策略文件已存在', details: 'A strategy with this filename already exists.' },
        { status: 409 } // 409 Conflict is more appropriate
      );
    }
    return NextResponse.json(
      { error: '上传策略失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
