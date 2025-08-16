import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const hyperopt = await prisma.hyperoptTask.findUnique({
      where: { id: params.id },
    })

    if (!hyperopt) {
      return NextResponse.json({ error: 'Hyperopt task not found' }, { status: 404 })
    }

    if (!hyperopt.resultsPath) {
      return NextResponse.json({ error: 'Results not available' }, { status: 404 })
    }

    if (hyperopt.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Hyperopt task not completed' }, { status: 400 })
    }

    // 使用 Python 脚本解析 pickle 文件
    const pythonScript = `
import pickle
import json
import sys
import os

try:
    with open('${hyperopt.resultsPath}', 'rb') as f:
        results = pickle.load(f)
    
    # 提取最佳结果
    if hasattr(results, 'get_best_result'):
        best_result = results.get_best_result()
    else:
        best_result = results
    
    # 转换为可序列化的格式
    def convert_to_serializable(obj):
        if hasattr(obj, '__dict__'):
            return obj.__dict__
        elif isinstance(obj, (list, tuple)):
            return [convert_to_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {key: convert_to_serializable(value) for key, value in obj.items()}
        else:
            return obj
    
    serializable_result = convert_to_serializable(best_result)
    print(json.dumps(serializable_result))
    
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
`

    try {
      const { stdout } = await execAsync(`python3 -c "${pythonScript}"`)
      const result = JSON.parse(stdout)
      
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      
      return NextResponse.json(result)
    } catch (execError) {
      console.error('[DEBUG] Python 脚本执行失败:', execError)
      return NextResponse.json(
        { 
          error: 'Failed to parse hyperopt results',
          details: execError instanceof Error ? execError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[DEBUG] 获取 Hyperopt 结果失败:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch hyperopt results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}