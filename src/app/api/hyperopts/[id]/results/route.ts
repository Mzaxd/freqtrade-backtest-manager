import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { spawn } from 'child_process'
import path from 'path'
import { access } from 'fs/promises'
import { constants } from 'fs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const hyperopt = await prisma.hyperoptTask.findUnique({
      where: { id },
    })

    if (!hyperopt || !hyperopt.resultsPath) {
      return new NextResponse(JSON.stringify({ error: 'Results not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || path.join(process.cwd(), 'ft_user_data')
    
    let pickleFilePath: string;
    if (path.isAbsolute(hyperopt.resultsPath)) {
      // Handle old, absolute paths for backward compatibility
      pickleFilePath = hyperopt.resultsPath
    } else {
      // Handle new, relative paths
      pickleFilePath = path.join(userDataPath, hyperopt.resultsPath)
    }
    
    // 验证文件是否存在
    try {
      await access(pickleFilePath, constants.F_OK | constants.R_OK)
    } catch (fileError) {
      console.error(`Results file not found or not accessible: ${pickleFilePath}`, fileError)
      return new NextResponse(JSON.stringify({ error: 'Results file not found or is inaccessible.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const pythonScriptPath = path.resolve(process.cwd(), 'scripts/pickle_to_json.py')

    const pythonProcess = spawn('python', [pythonScriptPath, pickleFilePath])

    let jsonData = ''
    let errorData = ''

    pythonProcess.stdout.on('data', (data) => {
      jsonData += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString()
    })

    const exitCode = await new Promise<number>((resolve) => {
      pythonProcess.on('close', resolve)
    })

    if (exitCode !== 0) {
      console.error(`Python script exited with code ${exitCode}: ${errorData}`)
      return new NextResponse(JSON.stringify({ error: 'Failed to process results file', details: errorData }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      let results = JSON.parse(jsonData)
      
      // Add a defensive check to ensure results is an array
      if (!Array.isArray(results)) {
        // If results is not an array (e.g., it's an error object from the script),
        // reset it to an empty array to prevent frontend errors.
        results = [];
      }
      
      // Freqtrade hyperopt results are typically a list of dicts.
      // Let's find the best one to also return it.
      let best_epoch = null;
      if (Array.isArray(results) && results.length > 0) {
        best_epoch = results.reduce((best, current) => {
          return current.loss < best.loss ? current : best;
        }, results[0]);
      }

      return new NextResponse(JSON.stringify({ results, best_epoch }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new NextResponse(JSON.stringify({ error: 'Failed to parse results data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('API Error:', error)
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}