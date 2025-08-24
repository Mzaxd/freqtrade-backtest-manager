import Redis from 'ioredis'
import { z } from 'zod'
import { NextRequest } from 'next/server'

// Redis client for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Cache key schema
const CacheKeySchema = z.object({
  prefix: z.string(),
  id: z.string(),
  suffix: z.string().optional()
})

/**
 * Redis caching utilities for API responses
 */
export class ApiCache {
  public static readonly DEFAULT_TTL = 300 // 5 minutes
  public static readonly AVAILABLE_PAIRS_TTL = 600 // 10 minutes

  /**
   * Generate cache key for available pairs
   */
  static getAvailablePairsKey(backtestId: string): string {
    return `available-pairs:${backtestId}`
  }

  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key)
      if (!cached) return null

      return JSON.parse(cached) as T
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set<T>(
    key: string, 
    data: T, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  /**
   * Clear cache by pattern
   */
  static async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache clear pattern error:', error)
    }
  }

  /**
   * Get or set pattern with callback
   */
  static async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      // If not in cache, execute callback
      const data = await callback()

      // Cache the result
      await this.set(key, data, ttl)

      return data
    } catch (error) {
      console.error('Cache getOrSet error:', error)
      // If cache fails, return fresh data
      return callback()
    }
  }

  /**
   * Cache available pairs data
   */
  static async cacheAvailablePairs(
    backtestId: string,
    data: {
      pairs: string[]
      totalPairs: number
      defaultPair: string | null
    }
  ): Promise<void> {
    const key = this.getAvailablePairsKey(backtestId)
    await this.set(key, data, this.AVAILABLE_PAIRS_TTL)
  }

  /**
   * Get cached available pairs data
   */
  static async getCachedAvailablePairs(
    backtestId: string
  ): Promise<{
    pairs: string[]
    totalPairs: number
    defaultPair: string | null
  } | null> {
    const key = this.getAvailablePairsKey(backtestId)
    return this.get(key)
  }

  /**
   * Invalidate available pairs cache for a backtest
   */
  static async invalidateAvailablePairs(backtestId: string): Promise<void> {
    const key = this.getAvailablePairsKey(backtestId)
    await this.delete(key)
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    keyCount: number
    memoryUsage: string
    connected: boolean
  }> {
    try {
      const keyCount = await redis.dbsize()
      const info = await redis.info('memory')
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/)
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown'

      return {
        keyCount,
        memoryUsage,
        connected: true
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return {
        keyCount: 0,
        memoryUsage: 'unknown',
        connected: false
      }
    }
  }
}

/**
 * Response caching decorator
 */
export function withCache<T>(
  keyGenerator: (request: NextRequest, params: any) => string,
  ttl: number = ApiCache.DEFAULT_TTL
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<T>>
  ) {
    const method = descriptor.value!

    descriptor.value = async function (request: NextRequest, ...args: any[]): Promise<T> {
      try {
        const key = keyGenerator(request, args)
        
        // Try to get from cache
        const cached = await ApiCache.get<T>(key)
        if (cached !== null) {
          return cached
        }

        // Execute original method
        const result = await method.apply(this, [request, ...args])

        // Cache the result
        await ApiCache.set(key, result, ttl)

        return result
      } catch (error) {
        console.error('Cache decorator error:', error)
        // If cache fails, execute original method
        return method.apply(this, [request, ...args])
      }
    }

    return descriptor
  }
}

export default ApiCache