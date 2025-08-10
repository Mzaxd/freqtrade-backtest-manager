import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

import { pinyin } from 'pinyin';

const isObject = (item: any): item is object => {
   return (item && typeof item === 'object' && !Array.isArray(item));
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
                   (output as any)[key] = deepMerge(targetValue, sourceValue as object);
               } else {
                   (output as any)[key] = sourceValue;
               }
           } else {
               (output as any)[key] = sourceValue;
           }
       });
   }
   return output;
};


const buildDefaultConfig = (params: any): any => {
   const config: { [key: string]: any } = {};
   for (const key in params) {
       if (Object.prototype.hasOwnProperty.call(params, key)) {
           const param = params[key];
           if (param.properties && Object.keys(param.properties).length > 0) {
               config[key] = buildDefaultConfig(param.properties);
           } else {
               config[key] = param.default;
           }
       }
   }
   return config;
};

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, config: userData, name, description } = body;

    if (!filename || !userData) {
      return NextResponse.json(
        { error: 'Missing required fields: filename and config are required' },
        { status: 400 }
      );
    }

    // 1. 读取完整的配置参数定义
    // const paramsFilePath = path.join(process.cwd(), 'public', 'freqtrade-config-parameters.json');
    // const paramsFileContent = await fs.promises.readFile(paramsFilePath, 'utf-8');
    // const configParams = JSON.parse(paramsFileContent);

    // // 2. 构建包含所有默认值的嵌套配置对象
    // const defaultConfig = buildDefaultConfig(configParams);

    // 3. 深度合并用户提交的数据和默认配置
    const finalData = userData;

    // 验证 timeframe 是否存在
    if (!finalData.timeframe) {
      return NextResponse.json(
        { error: 'Field "timeframe" is required in the configuration.' },
        { status: 400 }
      );
    }

    // 4. 执行特定的验证和逻辑（如果需要）
    // if (
    //   finalData.pairlists &&
    //   Array.isArray(finalData.pairlists) &&
    //   finalData.pairlists.some((p: any) => p.method === 'StaticPairList') &&
    //   (!finalData.exchange.pair_whitelist ||
    //     !Array.isArray(finalData.exchange.pair_whitelist) ||
    //     finalData.exchange.pair_whitelist.length === 0)
    // ) {
    //   return NextResponse.json(
    //     {
    //       error: 'Validation failed: Using StaticPairList requires a non-empty pair_whitelist.',
    //     },
    //     { status: 400 }
    //   );
    // }

    // 5. 生成文件名并写入文件
    const configsPath = getConfigsPath();
    await fs.mkdir(configsPath, { recursive: true });
    const configFilePath = path.join(configsPath, filename);

    // 强制删除旧的或冲突的 log_config 和 logfile 键
    delete finalData.log_config;
    delete finalData.logfile;
    delete (finalData as any).forcebuy_enable;
    
    await fs.writeFile(configFilePath, JSON.stringify(finalData, null, 2));

    // 6. 在数据库中创建记录
    const newConfig = await prisma.config.create({
      data: {
        name: name || filename.replace('.json', ''),
        filename,
        description: description || '',
        data: finalData,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newConfig,
        message: 'Configuration created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating configuration:', error);
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
       return NextResponse.json(
        {
          error: 'Failed to create configuration',
          details: 'A configuration with this name already exists.',
        },
        { status: 409 } // 409 Conflict
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to create configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // 获取单个配置的详细信息
      const config = await prisma.config.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!config) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: config,
        message: 'Configuration retrieved successfully',
      });
    } else {
      // 获取所有配置的列表（不包括详细的 data）
      const configs = await prisma.config.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          filename: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return NextResponse.json({
        success: true,
        data: configs,
        message: 'Configurations list retrieved successfully',
      });
    }
  } catch (error) {
    console.error('Error retrieving configuration(s):', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve configuration(s)',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
