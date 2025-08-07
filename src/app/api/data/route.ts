import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search')
  try {
    const marketData = await prisma.marketData.findMany({
      where: {
        OR: [
          {
            pair: {
              contains: search || '',
              mode: 'insensitive',
            },
          },
          {
            exchange: {
              contains: search || '',
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    return NextResponse.json(marketData)
  } catch (error) {
    console.error('Failed to fetch market data:', error)
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}