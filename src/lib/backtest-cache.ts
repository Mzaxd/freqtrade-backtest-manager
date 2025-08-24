import { prisma } from '@/lib/prisma'
import ApiCache from '@/lib/api-cache'

/**
 * Cache invalidation utilities for backtest-related data
 */
export class BacktestCacheManager {
  /**
   * Invalidate cache when backtest is updated
   */
  static async onBacktestUpdate(backtestId: string): Promise<void> {
    try {
      // Invalidate available pairs cache
      await ApiCache.invalidateAvailablePairs(backtestId)
      
      // Invalidate chart data cache (if any)
      await ApiCache.clearPattern(`chart-data:${backtestId}:*`)
      
      console.log(`Cache invalidated for backtest ${backtestId}`)
    } catch (error) {
      console.error('Failed to invalidate cache for backtest:', error)
    }
  }

  /**
   * Invalidate cache when trades are updated
   */
  static async onTradesUpdate(backtestId: string): Promise<void> {
    try {
      // Invalidate available pairs cache since pairs might have changed
      await ApiCache.invalidateAvailablePairs(backtestId)
      
      // Invalidate any trade-related cache
      await ApiCache.clearPattern(`trades:${backtestId}:*`)
      
      console.log(`Cache invalidated for trades in backtest ${backtestId}`)
    } catch (error) {
      console.error('Failed to invalidate cache for trades:', error)
    }
  }

  /**
   * Prefetch cache for frequently accessed backtests
   */
  static async prefetchBacktestData(backtestId: string): Promise<void> {
    try {
      // Get available pairs and cache them
      const backtest = await prisma.backtestTask.findUnique({
        where: { id: backtestId },
        include: {
          trades: {
            select: {
              pair: true,
            },
          },
        },
      })

      if (backtest) {
        const uniquePairs = Array.from(
          new Set(backtest.trades.map(trade => trade.pair))
        ).sort()

        const result = {
          pairs: uniquePairs,
          totalPairs: uniquePairs.length,
          defaultPair: uniquePairs[0] || null
        }

        await ApiCache.cacheAvailablePairs(backtestId, result)
        console.log(`Prefetched cache for backtest ${backtestId}`)
      }
    } catch (error) {
      console.error('Failed to prefetch cache for backtest:', error)
    }
  }

  /**
   * Bulk invalidate cache for multiple backtests
   */
  static async bulkInvalidate(backtestIds: string[]): Promise<void> {
    try {
      const promises = backtestIds.map(id => this.onBacktestUpdate(id))
      await Promise.all(promises)
      console.log(`Bulk cache invalidation completed for ${backtestIds.length} backtests`)
    } catch (error) {
      console.error('Failed to bulk invalidate cache:', error)
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getCacheStats(): Promise<{
    totalKeys: number
    backtestCacheKeys: number
    memoryUsage: string
    connected: boolean
  }> {
    try {
      const stats = await ApiCache.getStats()
      const backtestKeys = await ApiCache.clearPattern('available-pairs:*')
      
      return {
        totalKeys: stats.keyCount,
        backtestCacheKeys: 0, // Would need to count pattern matches
        memoryUsage: stats.memoryUsage,
        connected: stats.connected
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return {
        totalKeys: 0,
        backtestCacheKeys: 0,
        memoryUsage: 'unknown',
        connected: false
      }
    }
  }
}

export default BacktestCacheManager