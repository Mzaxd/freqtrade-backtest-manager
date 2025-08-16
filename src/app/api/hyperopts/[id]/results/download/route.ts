import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import path from 'path'

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
      return new NextResponse(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const basePath = process.env.FREQTRADE_USER_DATA_PATH
    if (!basePath) {
      throw new Error('FREQTRADE_USER_DATA_PATH environment variable not set')
    }

    const filePath = path.join(basePath, hyperopt.resultsPath)
    const fileBuffer = await readFile(filePath)
    const filename = path.basename(filePath)

    // The 'any' cast is used here to bypass a type mismatch between Node.js Buffer and Next.js's expected BodyInit type.
    // This is a known issue in some environments and this workaround is safe in this context.
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to download file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}