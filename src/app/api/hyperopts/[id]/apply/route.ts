import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const hyperopt = await prisma.hyperoptTask.findUnique({
      where: { id: params.id },
      include: {
        strategy: true,
      },
    })

    if (!hyperopt) {
      return NextResponse.json({ error: 'Hyperopt task not found' }, { status: 404 })
    }

    if (hyperopt.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Hyperopt task not completed' }, { status: 400 })
    }

    if (!hyperopt.bestResult) {
      return NextResponse.json({ error: 'Best result not available' }, { status: 404 })
    }

    const strategyPath = hyperopt.strategy.filename
    
    // 读取原始策略文件
    let strategyContent: string
    try {
      strategyContent = await readFile(strategyPath, 'utf-8')
    } catch (fileError) {
      console.error('[DEBUG] 无法读取策略文件:', fileError)
      return NextResponse.json(
        { 
          error: 'Failed to read strategy file',
          details: fileError instanceof Error ? fileError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // 创建备份文件
    const backupPath = strategyPath + '.backup.' + Date.now()
    try {
      await writeFile(backupPath, strategyContent)
    } catch (backupError) {
      console.error('[DEBUG] 创建备份文件失败:', backupError)
      // 不阻止主流程，只是记录警告
    }

    // 解析最佳结果
    const bestResult = hyperopt.bestResult as any
    const optimizedParams = bestResult.params || {}

    // 应用优化参数到策略文件
    let updatedContent = strategyContent
    
    // 更新 buy 参数
    if (optimizedParams.buy) {
      Object.entries(optimizedParams.buy).forEach(([key, value]) => {
        const regex = new RegExp(`(${key}\\s*=\\s*)([\\d.]+)`, 'g')
        updatedContent = updatedContent.replace(regex, `$1${value}`)
      })
    }

    // 更新 sell 参数
    if (optimizedParams.sell) {
      Object.entries(optimizedParams.sell).forEach(([key, value]) => {
        const regex = new RegExp(`(${key}\\s*=\\s*)([\\d.]+)`, 'g')
        updatedContent = updatedContent.replace(regex, `$1${value}`)
      })
    }

    // 更新 stoploss
    if (optimizedParams.stoploss) {
      const stoplossRegex = new RegExp(`(stoploss\\s*=\\s*)([\\d.-]+)`, 'g')
      updatedContent = updatedContent.replace(stoplossRegex, `$1${optimizedParams.stoploss}`)
    }

    // 更新 ROI 参数
    if (optimizedParams.roi) {
      Object.entries(optimizedParams.roi).forEach(([key, value]) => {
        const roiRegex = new RegExp(`(minimal_roi\\s*=\\s*\\{[^}]*${key}\\s*:\\s*)([\\d.]+)`, 'g')
        updatedContent = updatedContent.replace(roiRegex, `$1${value}`)
      })
    }

    // 写入更新后的策略文件
    try {
      await writeFile(strategyPath, updatedContent)
    } catch (writeError) {
      console.error('[DEBUG] 写入策略文件失败:', writeError)
      return NextResponse.json(
        { 
          error: 'Failed to write strategy file',
          details: writeError instanceof Error ? writeError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Optimized parameters applied to strategy',
      backupPath: backupPath
    })
  } catch (error) {
    console.error('[DEBUG] 应用优化结果失败:', error)
    return NextResponse.json(
      { 
        error: 'Failed to apply hyperopt results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}