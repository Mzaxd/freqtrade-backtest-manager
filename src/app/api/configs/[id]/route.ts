import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
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
  const pinyinName = pinyin(name, {
    style: 'normal',
  }).join('');
  return `${pinyinName.replace(/[\s\W]/g, '_')}.json`;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的 ID 格式' }, { status: 400 });
    }

    const config = await prisma.config.findUnique({
      where: { id },
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
    console.error(`Error retrieving configuration ${params.id}: `, error);
    return NextResponse.json(
      {
        error: '检索配置失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的 ID 格式' }, { status: 400 });
    }
    
    const body = await request.json();
    const { name, description, data } = body;

    // 验证，确保至少有一个字段用于更新
    if (!name && !description && !data) {
      return NextResponse.json(
        { error: '无字段可更新。提供名称、描述或数据。' },
        { status: 400 }
      );
    }
    
    // 检查配置是否存在
    const existingConfig = await prisma.config.findUnique({ where: { id } });
    if (!existingConfig) {
        return NextResponse.json({ error: '配置未找到' }, { status: 404 });
    }

    const configsPath = getConfigsPath();
    let newFilename = existingConfig.filename;

    if (name && name !== existingConfig.name) {
      newFilename = generateSafeFilename(name)
      if (existingConfig.filename) {
        const oldFilePath = path.join(configsPath, existingConfig.filename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }
    
    const configFilePath = path.join(configsPath, newFilename ?? generateSafeFilename(name));
    fs.writeFileSync(configFilePath, JSON.stringify(data || existingConfig.data, null, 2));

    const updatedConfig = await prisma.config.update({
      where: { id },
      data: {
        name: name || existingConfig.name,
        filename: newFilename,
        description: description || existingConfig.description,
        data: data || existingConfig.data,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: '配置更新成功',
    });
  } catch (error) {
    console.error(`Error updating configuration ${params.id}: `, error);
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
       return NextResponse.json(
        {
          error: '更新配置失败',
          details: '同名配置已存在',
        },
        { status: 409 } // 409 Conflict
      );
    }
    return NextResponse.json(
      {
        error: '更新配置失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的 ID 格式' }, { status: 400 });
    }

    // 检查配置是否存在，并包含关联的回测任务
    const existingConfig = await prisma.config.findUnique({
      where: { id },
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
      if (fs.existsSync(configFilePath)) {
        fs.unlinkSync(configFilePath);
      }
    }

    await prisma.config.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        success: true,
        message: '配置删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting configuration ${params.id}: `, error);
    return NextResponse.json(
      {
        error: '删除配置失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}