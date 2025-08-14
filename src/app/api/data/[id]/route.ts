import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  try {
    console.log('Attempting to delete market data with id:', id)

    const marketData = await prisma.marketData.findUnique({
      where: { id },
    })

    if (marketData && marketData.filePath) {
      try {
        await fs.unlink(marketData.filePath)
        console.log('Successfully deleted file:', marketData.filePath)
      } catch (fileError) {
        console.error('Failed to delete file:', fileError)
        // Decide if you want to stop or continue if file deletion fails
      }
    }

    await prisma.marketData.delete({
      where: { id },
    })
    console.log('Successfully deleted market data with id:', id)
    return NextResponse.json({ message: 'Market data deleted successfully' })
  } catch (error) {
    console.error('Failed to delete market data:', error)
    return NextResponse.json(
      { error: 'Failed to delete market data' },
      { status: 500 }
    )
  }
}