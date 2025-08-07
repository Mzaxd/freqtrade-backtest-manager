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

export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
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

export async function PUT(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: '无效的 ID 格式' }, { status: 400 });
    }
    
    const body = await request.json();
    const { name, description, data: userData } = body;

    // 验证，确保至少有一个字段用于更新
    if (!name && !description && !userData) {
      return NextResponse.json(
        { error: '无字段可更新。提供名称、描述或数据。' },
        { status: 400 }
      );
    }
    
    // 检查配置是否存在
    const existingConfig = await prisma.config.findUnique({ where: { id: idNum } });
    if (!existingConfig) {
        return NextResponse.json({ error: '配置未找到' }, { status: 404 });
    }

    // 1. 读取完整的配置参数定义
    const paramsFilePath = path.join(process.cwd(), 'public', 'freqtrade-config-parameters.json');
    const paramsFileContent = await fs.promises.readFile(paramsFilePath, 'utf-8');
    const configParams = JSON.parse(paramsFileContent);

    // 2. 构建包含所有默认值的配置对象
    const defaultConfig: { [key: string]: any } = {};
    for (const key in configParams) {
      if (Object.prototype.hasOwnProperty.call(configParams, key)) {
        defaultConfig[key] = configParams[key].default;
      }
    }

    // 3. 合并数据：默认配置 -> 数据库中的现有配置 -> 用户提交的新数据
    const finalData = { ...defaultConfig, ...(existingConfig.data as object), ...userData };

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
    
    // 强制删除旧的或冲突的 log_config 和 logfile 键
    delete finalData.log_config;
    delete finalData.logfile;

    fs.writeFileSync(configFilePath, JSON.stringify(finalData, null, 2));

    const updatedConfig = await prisma.config.update({
      where: { id: idNum },
      data: {
        name: name || existingConfig.name,
        filename: newFilename,
        description: description || existingConfig.description,
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<Params> }) {
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
      if (fs.existsSync(configFilePath)) {
        fs.unlinkSync(configFilePath);
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