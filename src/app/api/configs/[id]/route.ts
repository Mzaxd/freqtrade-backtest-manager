import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { pinyin } from 'pinyin';

interface Params {
  id: string;
}

const getConfigsPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data');
  return path.join(userDataPath, 'configs');
};

function generateSafeFilename(name: string): string {
  // Input validation and sanitization
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('Invalid filename input');
  }
  
  // Remove potentially dangerous characters
  const sanitizedName = name.replace(/[^\w\s\u4e00-\u9fff-]/g, '');
  
  const pinyinName = pinyin(sanitizedName, {
    style: 'normal',
  }).join('');
  
  const safeName = pinyinName.replace(/[\s\W]/g, '_');
  
  // Ensure filename is not empty and has reasonable length
  if (safeName.length === 0) {
    throw new Error('Generated filename is empty');
  }
  
  if (safeName.length > 100) {
    throw new Error('Filename too long');
  }
  
  return `${safeName}.json`;
}

const isObject = (item: unknown): item is object => {
   return item !== null && typeof item === 'object' && !Array.isArray(item);
};

const deepMerge = <T extends object, U extends object>(target: T, source: U): T & U => {
   const output = { ...target } as T & U;

   if (isObject(target) && isObject(source)) {
       Object.keys(source).forEach(key => {
           const sourceKey = key as keyof U;
           const sourceValue = source[sourceKey];
           
           if (key in target) {
               const targetValue = target[key as keyof T];
               if (isObject(sourceValue) && isObject(targetValue)) {
                   (output as Record<string, unknown>)[key] = deepMerge(
                       targetValue as object, 
                       sourceValue as object
                   );
               } else {
                   (output as Record<string, unknown>)[key] = sourceValue;
               }
           } else {
               (output as Record<string, unknown>)[key] = sourceValue;
           }
       });
   }
   return output;
};


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: '无效的 ID 格式' }, { status: 400 });
    }

    const config = await prisma.config.findUnique({
      where: { id: idNum },
    });

    if (!config) {
      return NextResponse.json({ error: '配置未找到' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: config,
      message: '配置检索成功',
    });
  } catch (error) {
    console.error('Error retrieving configuration: ', error);
    return NextResponse.json(
      {
        error: '检索配置失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: '无效的 ID 格式' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, config: userData, filename } = body;

    // Input validation
    if (!name || !filename || !userData) {
      return NextResponse.json(
        { error: '缺少必填字段：需要 name、filename 和 config' },
        { status: 400 },
      );
    }

    // Validate filename to prevent path traversal
    if (typeof filename !== 'string' || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename format' },
        { status: 400 },
      );
    }

    // Validate filename extension
    if (!filename.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Filename must end with .json' },
        { status: 400 },
      );
    }

    const existingConfig = await prisma.config.findUnique({
      where: { id: idNum },
    });
    if (!existingConfig) {
      return NextResponse.json({ error: '配置未找到' }, { status: 404 });
    }

    const finalData = userData;

    // 验证 timeframe 是否存在
    if (!finalData.timeframe) {
      return NextResponse.json(
        { error: 'Field "timeframe" is required in the configuration.' },
        { status: 400 }
      );
    }

    const configsPath = getConfigsPath();

    if (filename !== existingConfig.filename && existingConfig.filename) {
      const oldFilePath = path.join(configsPath, existingConfig.filename);
      try {
        await fs.access(oldFilePath);
        await fs.unlink(oldFilePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error('删除旧配置文件时出错:', error);
        }
      }
    }

    const configFilePath = path.join(configsPath, filename);
    await fs.writeFile(configFilePath, JSON.stringify(finalData, null, 2));

    const updatedConfig = await prisma.config.update({
      where: { id: idNum },
      data: {
        name: name,
        filename: filename,
        description: description,
        data: finalData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: '配置更新成功',
    });
  } catch (error) {
    console.error('Error updating configuration: ', error);
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        {
          error: '更新配置失败',
          details: '同名配置已存在',
        },
        { status: 409 }, // 409 Conflict
      );
    }
    return NextResponse.json(
      {
        error: '更新配置失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: '无效的 ID 格式' }, { status: 400 });
    }

    // 检查配置是否存在，并包含关联的回测任务
    const existingConfig = await prisma.config.findUnique({
      where: { id: idNum },
      include: { backtests: true },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: '配置未找到' }, { status: 404});
    }

    // 如果有关联的回测任务，则阻止删除
    if (existingConfig.backtests.length > 0) {
      return NextResponse.json(
        {
          error: `无法删除配置：它已关联 ${existingConfig.backtests.length} 个回测任务`,
        },
        { status: 400 }
      );
    }

    // 删除物理文件
    if (existingConfig.filename) {
      const configsPath = getConfigsPath();
      const configFilePath = path.join(configsPath, existingConfig.filename);
      try {
        await fs.access(configFilePath);
        await fs.unlink(configFilePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error('删除配置文件时出错:', error);
        }
      }
    }

    await prisma.config.delete({
      where: { id: idNum },
    });

    return NextResponse.json(
      {
        success: true,
        message: '配置删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting configuration: ', error);
    return NextResponse.json(
      {
        error: '删除配置失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}