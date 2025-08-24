/**
 * React performance optimization utilities
 * Provides hooks and utilities for optimizing React components
 */

import * as React from 'react'
import { useEffect, useRef, useCallback, useMemo, useState } from 'react'

// ===== Performance Monitoring Hooks =====

/**
 * Hook for monitoring component render performance
 */
export function usePerformanceMonitoring() {
  const renderTimes = useRef<number[]>([])
  const lastRenderTime = useRef<number>(0)

  const startRender = useCallback(() => {
    return performance.now()
  }, [])

  const endRender = useCallback((startTime: number, dataPoints?: number) => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    renderTimes.current.push(renderTime)
    
    // Keep only the last 100 render times
    if (renderTimes.current.length > 100) {
      renderTimes.current = renderTimes.current.slice(-100)
    }
    
    lastRenderTime.current = renderTime
    
    // Log slow renders
    if (renderTime > 16.67) { // Longer than 60fps
      console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`, {
        dataPoints,
        averageRenderTime: getAverageRenderTime(),
        renderTimes: renderTimes.current.length
      })
    }
    
    return renderTime
  }, [])

  const getAverageRenderTime = useCallback(() => {
    if (renderTimes.current.length === 0) return 0
    const sum = renderTimes.current.reduce((a, b) => a + b, 0)
    return sum / renderTimes.current.length
  }, [])

  const getRenderStats = useCallback(() => ({
    lastRenderTime: lastRenderTime.current,
    averageRenderTime: getAverageRenderTime(),
    totalRenders: renderTimes.current.length,
    slowRenders: renderTimes.current.filter(time => time > 16.67).length
  }), [getAverageRenderTime])

  return { startRender, endRender, getRenderStats }
}

// ===== Memory Leak Prevention Hooks =====

/**
 * Hook for preventing memory leaks in useEffect
 */
export function useSafeEffect(effect: () => (() => void) | void, deps: any[]) {
  useEffect(() => {
    let isMounted = true
    let cleanup: (() => void) | void

    try {
      cleanup = effect()
    } catch (error) {
      console.error('Effect error:', error)
    }

    return () => {
      isMounted = false
      
      if (typeof cleanup === 'function') {
        try {
          cleanup()
        } catch (error) {
          console.error('Cleanup error:', error)
        }
      }
    }
  }, deps)
}

/**
 * Hook for safe async operations
 */
export function useSafeAsync<T>() {
  const isMounted = useRef(true)
  const abortControllers = useRef<AbortController[]>([])

  const execute = useCallback(async (
    operation: (signal: AbortSignal) => Promise<T>,
    options: {
      timeout?: number
      retries?: number
    } = {}
  ): Promise<T> => {
    if (!isMounted.current) {
      throw new Error('Component unmounted')
    }

    const { timeout, retries = 0 } = options
    const abortController = new AbortController()
    abortControllers.current.push(abortController)

    const executeWithRetry = async (attempt: number): Promise<T> => {
      try {
        const result = await Promise.race([
          operation(abortController.signal),
          new Promise<never>((_, reject) => {
            if (timeout) {
              setTimeout(() => reject(new Error('Operation timeout')), timeout)
            }
          })
        ])

        if (!isMounted.current) {
          throw new Error('Component unmounted')
        }

        return result
      } catch (error) {
        if (error instanceof Error && (error.name === 'AbortError' || !isMounted.current)) {
          throw new Error('Operation aborted')
        }

        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          return executeWithRetry(attempt + 1)
        }

        throw error
      }
    }

    return executeWithRetry(0)
  }, [])

  const cleanup = useCallback(() => {
    isMounted.current = false
    
    // Abort all pending operations
    abortControllers.current.forEach(controller => {
      try {
        controller.abort()
      } catch (error) {
        console.error('Abort error:', error)
      }
    })
    
    abortControllers.current = []
  }, [])

  return { execute, cleanup }
}

// ===== Optimization Hooks =====

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for throttling functions
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0)

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall.current >= delay) {
        lastCall.current = now
        return callback(...args)
      }
    }) as T,
    [callback, delay]
  )
}

/**
 * Hook for requestAnimationFrame
 */
export function useRAF() {
  const rafRef = useRef<number | null>(null)

  const requestAnimationFrame = useCallback((callback: FrameRequestCallback) => {
    rafRef.current = window.requestAnimationFrame(callback)
    return rafRef.current
  }, [])

  const cancelAnimationFrame = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimationFrame()
    }
  }, [cancelAnimationFrame])

  return { requestAnimationFrame, cancelAnimationFrame }
}

// ===== Memoization Utilities =====

/**
 * Hook for memoizing expensive calculations
 */
export function useMemoized<T>(
  calculation: () => T,
  deps: any[],
  options: {
    maxSize?: number
    keyGenerator?: (...args: any[]) => string
  } = {}
): T {
  const { maxSize = 100, keyGenerator } = options
  const cache = useRef<Map<string, T>>(new Map())

  return useMemo(() => {
    const key = keyGenerator ? keyGenerator(...deps) : JSON.stringify(deps)
    
    if (cache.current.has(key)) {
      return cache.current.get(key)!
    }

    const result = calculation()
    
    // Manage cache size
    if (cache.current.size >= maxSize) {
      const firstKey = cache.current.keys().next().value
      if (firstKey) {
        cache.current.delete(firstKey)
      }
    }
    
    cache.current.set(key, result)
    return result
  }, deps)
}

// ===== Event Listener Optimization =====

/**
 * Hook for optimized event listeners
 */
export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    const eventListener = (event: WindowEventMap[K]) => {
      savedHandler.current(event)
    }

    window.addEventListener(event, eventListener, options)

    return () => {
      window.removeEventListener(event, eventListener, options)
    }
  }, [event, options])
}

/**
 * Hook for optimized resize observer
 */
export function useResizeObserver(
  target: React.RefObject<Element>,
  callback: ResizeObserverCallback
) {
  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (!target.current) return

    observerRef.current = new ResizeObserver(callback)
    observerRef.current.observe(target.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [target, callback])
}

// ===== Virtualization Utilities =====

/**
 * Hook for virtualizing large lists
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  options: {
    overscan?: number
    scrollTop?: number
  } = {}
) {
  const { overscan = 3, scrollTop = 0 } = options

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }))
  }, [items, startIndex, endIndex, itemHeight])

  const totalHeight = items.length * itemHeight

  return {
    visibleItems,
    totalHeight,
    startIndex,
    endIndex
  }
}

// ===== Performance Optimization HOC =====

/**
 * HOC for memoizing components
 */
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  customCompare?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = React.memo(Component, customCompare)

  return function WrappedComponent(props: P) {
    return React.createElement(MemoizedComponent, props)
  }
}

/**
 * HOC for error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  return function ErrorBoundaryWrapper(props: P) {
    const [error, setError] = useState<Error | null>(null)
    const [retryCount, setRetryCount] = useState(0)

    const handleError = useCallback((error: Error) => {
      console.error('Component error:', error)
      setError(error)
    }, [])

    const retry = useCallback(() => {
      setError(null)
      setRetryCount(prev => prev + 1)
    }, [])

    if (error) {
      if (fallback) {
        return React.createElement(fallback, { error, retry })
      }
      
      return React.createElement('div', { className: 'error-boundary-fallback' },
        React.createElement('h2', null, 'Something went wrong'),
        React.createElement('p', null, error.message),
        React.createElement('button', { onClick: retry }, 'Retry')
      )
    }

    return React.createElement(Component, { ...props, onError: handleError })
  }
}

// ===== Performance Metrics =====

/**
 * Hook for tracking performance metrics
 */
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    totalTime: 0,
    averageTime: 0,
    maxTime: 0,
    minTime: Infinity
  })

  const trackRender = useCallback((renderTime: number) => {
    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1
      const newTotalTime = prev.totalTime + renderTime
      const newAverageTime = newTotalTime / newRenderCount
      const newMaxTime = Math.max(prev.maxTime, renderTime)
      const newMinTime = Math.min(prev.minTime, renderTime)

      return {
        renderCount: newRenderCount,
        totalTime: newTotalTime,
        averageTime: newAverageTime,
        maxTime: newMaxTime,
        minTime: newMinTime === Infinity ? renderTime : newMinTime
      }
    })
  }, [])

  const resetMetrics = useCallback(() => {
    setMetrics({
      renderCount: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity
    })
  }, [])

  return { metrics, trackRender, resetMetrics }
}