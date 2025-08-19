import React, { useEffect, useRef, useCallback, useMemo } from 'react'

export interface DataPoint {
  time: number | string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  fps: number
  dataPoints: number
}

// Data caching system
export class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  size(): number {
    return this.cache.size
  }
}

// Data optimization utilities
export function optimizeDataForRendering(
  data: DataPoint[],
  viewportWidth: number,
  maxDataPoints: number = 2000
): DataPoint[] {
  if (data.length <= maxDataPoints) {
    return data
  }

  const targetPoints = Math.min(maxDataPoints, viewportWidth)
  const step = Math.ceil(data.length / targetPoints)
  
  return data.filter((_, index) => index % step === 0)
}

export function downsampleData(
  data: DataPoint[],
  targetLength: number,
  method: 'lttb' | 'average' | 'max-min' = 'lttb'
): DataPoint[] {
  if (data.length <= targetLength) {
    return data
  }

  switch (method) {
    case 'lttb':
      return largestTriangleThreeBuckets(data, targetLength)
    case 'average':
      return averageDownsample(data, targetLength)
    case 'max-min':
      return maxMinDownsample(data, targetLength)
    default:
      return data.slice(0, targetLength)
  }
}

function largestTriangleThreeBuckets(data: DataPoint[], targetLength: number): DataPoint[] {
  if (data.length <= targetLength) return data

  const bucketSize = Math.floor(data.length / targetLength)
  const sampled: DataPoint[] = []
  
  // Always include first point
  sampled.push(data[0])
  
  for (let i = 1; i < targetLength - 1; i++) {
    const start = Math.floor((i - 1) * bucketSize)
    const end = Math.floor(i * bucketSize)
    const bucket = data.slice(start, end)
    
    if (bucket.length === 0) continue
    
    let maxArea = -1
    let selectedPoint = bucket[0]
    
    const prevPoint = sampled[sampled.length - 1]
    const nextPoint = data[Math.min(end + bucketSize, data.length - 1)]
    
    for (const point of bucket) {
      const prevTime = typeof prevPoint.time === 'number' ? prevPoint.time : 0
      const nextTime = typeof nextPoint.time === 'number' ? nextPoint.time : 0
      const pointTime = typeof point.time === 'number' ? point.time : 0
      
      const area = Math.abs(
        (prevPoint.close - nextPoint.close) * pointTime +
        (nextTime - prevTime) * point.close +
        (prevTime * nextPoint.close - nextTime * prevPoint.close)
      ) / 2
      
      if (area > maxArea) {
        maxArea = area
        selectedPoint = point
      }
    }
    
    sampled.push(selectedPoint)
  }
  
  // Always include last point
  sampled.push(data[data.length - 1])
  
  return sampled
}

function averageDownsample(data: DataPoint[], targetLength: number): DataPoint[] {
  const bucketSize = Math.floor(data.length / targetLength)
  const sampled: DataPoint[] = []
  
  for (let i = 0; i < targetLength; i++) {
    const start = i * bucketSize
    const end = Math.min(start + bucketSize, data.length)
    const bucket = data.slice(start, end)
    
    if (bucket.length === 0) continue
    
    const avg = bucket.reduce((acc, point) => ({
      time: point.time,
      open: acc.open + point.open,
      high: Math.max(acc.high, point.high),
      low: Math.min(acc.low, point.low),
      close: acc.close + point.close,
      volume: (acc.volume || 0) + (point.volume || 0),
    }), {
      time: bucket[0].time,
      open: 0,
      high: bucket[0].high,
      low: bucket[0].low,
      close: 0,
      volume: 0,
    })
    
    sampled.push({
      time: avg.time,
      open: avg.open / bucket.length,
      high: avg.high,
      low: avg.low,
      close: avg.close / bucket.length,
      volume: avg.volume,
    })
  }
  
  return sampled
}

function maxMinDownsample(data: DataPoint[], targetLength: number): DataPoint[] {
  const bucketSize = Math.floor(data.length / targetLength)
  const sampled: DataPoint[] = []
  
  for (let i = 0; i < targetLength; i++) {
    const start = i * bucketSize
    const end = Math.min(start + bucketSize, data.length)
    const bucket = data.slice(start, end)
    
    if (bucket.length === 0) continue
    
    const maxPoint = bucket.reduce((max, point) => 
      point.high > max.high ? point : max, bucket[0])
    const minPoint = bucket.reduce((min, point) => 
      point.low < min.low ? point : min, bucket[0])
    
    sampled.push(maxPoint)
    if (minPoint !== maxPoint) {
      sampled.push(minPoint)
    }
  }
  
  return sampled
}

// Performance monitoring
export function usePerformanceMonitoring() {
  const metrics = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    fps: 0,
    dataPoints: 0,
  })

  const startRender = useCallback(() => {
    return performance.now()
  }, [])

  const endRender = useCallback((startTime: number, dataPoints: number = 0) => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    metrics.current = {
      renderTime,
      memoryUsage: (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0,
      fps: 1000 / renderTime,
      dataPoints,
    }

    // Log slow renders
    if (renderTime > 16) { // 60fps threshold
      console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms for ${dataPoints} points`)
    }

    return metrics.current
  }, [])

  return { metrics: metrics.current, startRender, endRender }
}

// Virtual scrolling for large datasets
export function useVirtualScroll(
  data: DataPoint[],
  itemHeight: number = 40,
  containerHeight: number = 600,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    data.length - 1,
    visibleStart + Math.ceil(containerHeight / itemHeight)
  )

  const startIndex = Math.max(0, visibleStart - overscan)
  const endIndex = Math.min(data.length - 1, visibleEnd + overscan)

  const visibleData = data.slice(startIndex, endIndex + 1)
  const offsetY = startIndex * itemHeight
  const totalHeight = data.length * itemHeight

  const containerProps = {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    },
    style: {
      height: containerHeight,
      overflow: 'auto',
    },
  }

  const contentProps = {
    style: {
      height: totalHeight,
      position: 'relative' as const,
    },
  }

  const itemProps = (index: number) => ({
    style: {
      position: 'absolute' as const,
      top: (startIndex + index) * itemHeight,
      width: '100%',
      height: itemHeight,
    },
  })

  return {
    visibleData,
    containerProps,
    contentProps,
    itemProps,
    startIndex,
    endIndex,
  }
}

// Web Worker for heavy calculations
export function useDataWorker<T, R>(
  worker: Worker,
  input: T,
  deps: any[] = []
): { result: R | null; loading: boolean; error: Error | null } {
  const [result, setResult] = React.useState<R | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  useEffect(() => {
    if (!worker || !input) return

    setLoading(true)
    setError(null)

    const handleMessage = (e: MessageEvent) => {
      if (e.data.error) {
        setError(new Error(e.data.error))
      } else {
        setResult(e.data.result)
      }
      setLoading(false)
    }

    const handleError = (e: ErrorEvent) => {
      setError(e.error || new Error('Worker error'))
      setLoading(false)
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)

    worker.postMessage({ input })

    return () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
    }
  }, [worker, input, ...deps])

  return { result, loading, error }
}

// RequestAnimationFrame optimization
export function useRAF(callback: () => void, deps: any[] = []) {
  const requestRef = useRef<number>()
  const previousTimeRef = useRef<number>()

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time
    }

    const deltaTime = time - previousTimeRef.current
    previousTimeRef.current = time

    callback()
    requestRef.current = requestAnimationFrame(animate)
  }, [callback, ...deps])

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [animate])
}

// Debounced and throttled functions
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0)

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now()
      if (now - lastCallRef.current >= delay) {
        callback(...args)
        lastCallRef.current = now
      }
    }) as T,
    [callback, delay]
  )
}

// Memory optimization
export function useMemoryOptimization(data: DataPoint[], maxMemoryMB: number = 100) {
  const [optimizedData, setOptimizedData] = React.useState<DataPoint[]>(data)

  useEffect(() => {
    const estimateMemoryUsage = (data: DataPoint[]): number => {
      // Rough estimate of memory usage in bytes
      return data.length * 8 * 5 // 5 numbers per data point
    }

    const memoryUsage = estimateMemoryUsage(data)
    const maxMemoryBytes = maxMemoryMB * 1024 * 1024

    if (memoryUsage > maxMemoryBytes) {
      // Downsample data to fit memory constraints
      const reductionFactor = maxMemoryBytes / memoryUsage
      const targetLength = Math.floor(data.length * reductionFactor)
      const downsampled = downsampleData(data, targetLength)
      setOptimizedData(downsampled)
    } else {
      setOptimizedData(data)
    }
  }, [data, maxMemoryMB])

  return optimizedData
}

// Performance hooks
export function usePerformance() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    fps: 0,
    dataPoints: 0,
  })

  const measurePerformance = useCallback((startTime: number, dataPoints: number = 0) => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    setMetrics({
      renderTime,
      memoryUsage: (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0,
      fps: 1000 / renderTime,
      dataPoints,
    })
  }, [])

  return { metrics, measurePerformance }
}

// Data streaming optimization
export function useDataStream<T>(
  dataSource: () => Promise<T[]>,
  options: {
    batchSize?: number
    delay?: number
    maxRetries?: number
  } = {}
) {
  const { batchSize = 100, delay = 100, maxRetries = 3 } = options
  const [data, setData] = React.useState<T[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [hasMore, setHasMore] = React.useState(true)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    let retryCount = 0
    const loadBatch = async (): Promise<T[]> => {
      try {
        const batch = await dataSource()
        setLoading(false)
        return batch
      } catch (err) {
        retryCount++
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * retryCount))
          return loadBatch()
        }
        throw err
      }
    }

    try {
      const batch = await loadBatch()
      setData(prev => [...prev, ...batch])
      setHasMore(batch.length === batchSize)
    } catch (err) {
      setError(err as Error)
      setLoading(false)
    }
  }, [loading, hasMore, dataSource, batchSize, delay, maxRetries])

  return { data, loading, error, hasMore, loadMore }
}