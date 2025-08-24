import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import ApiCache from '@/lib/api-cache'

export const runtime = 'nodejs'

// Zod schema for params validation
const ParamsSchema = z.object({
  id: z.string().cuid(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return authResult.response!
    }

    const resolvedParams = await params
    const { id } = await ParamsSchema.parseAsync(resolvedParams)

    // Try to get from cache first
    const cached = await ApiCache.getCachedAvailablePairs(id)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      })
    }

    // Verify backtest exists
    const backtest = await prisma.backtestTask.findUnique({
      where: { id },
      include: {
        trades: {
          select: {
            pair: true,
          },
        },
      },
    })

    if (!backtest) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backtest not found' 
        },
        { status: 404 }
      )
    }

    // Extract unique trading pairs from trades
    const uniquePairs = Array.from(
      new Set(backtest.trades.map(trade => trade.pair))
    ).sort()

    // If no trades found, return empty array
    if (uniquePairs.length === 0) {
      const emptyResult = {
        pairs: [],
        totalPairs: 0,
        defaultPair: null
      }
      
      // Cache empty result
      await ApiCache.cacheAvailablePairs(id, emptyResult)
      
      return NextResponse.json({
        success: true,
        data: emptyResult,
        cached: false
      })
    }

    // Return formatted response
    const result = {
      pairs: uniquePairs,
      totalPairs: uniquePairs.length,
      defaultPair: uniquePairs[0] // First pair as default
    }

    // Cache the result
    await ApiCache.cacheAvailablePairs(id, result)

    return NextResponse.json({
      success: true,
      data: result,
      cached: false
    })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request parameters', 
          details: error.issues 
        }, 
        { status: 400 }
      )
    }
    
    console.error('Failed to fetch available trading pairs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch available trading pairs', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    )
  }
}