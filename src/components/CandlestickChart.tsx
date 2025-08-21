'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle, PriceScaleMode } from 'lightweight-charts'
import type {
  ChartOptions,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  Time,
  CandlestickSeriesOptions,
  SeriesMarkerPosition,
  SeriesMarkerShape
} from 'lightweight-charts'

import type {
  OHLCVData,
  TradeMarker,
  TradeData,
  ChartTheme,
  ChartEventHandlers,
  CrosshairMoveParams,
  ChartError
} from '@/types/chart'

// Re-export the main data type for backward compatibility
export type CandlestickData = OHLCVData

export interface ChartProps extends ChartEventHandlers {
  data: OHLCVData[]
  tradeMarkers?: TradeMarker[]
  width?: number
  height?: number
  theme?: ChartTheme
  showVolume?: boolean
  showGrid?: boolean
  showCrosshair?: boolean
  autoResize?: boolean
  performanceMode?: boolean
  className?: string
}

export function CandlestickChart({ 
  data, 
  tradeMarkers = [],
  width = 800,
  height = 600,
  onCrosshairMove,
  onTradeClick,
  onError, // Add onError to destructuring
  showVolume = false,
  showGrid = true,
  theme,
  showCrosshair = true,
  autoResize = true,
  performanceMode = false,
  className = ''
}: ChartProps) {
 const chartContainerRef = useRef<HTMLDivElement>(null)
 const chartRef = useRef<IChartApi | null>(null)
 const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
 const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
 const markersDataRef = useRef<TradeMarker[]>([])
 const tooltipRef = useRef<HTMLDivElement>(null)
 const tradeTooltipRef = useRef<HTMLDivElement>(null)
 const [error, setError] = useState<ChartError | null>(null)

  // 显示交易工具提示
  const showTradeTooltip = (trade: TradeMarker, point: { x: number; y: number }) => {
    if (tradeTooltipRef.current) {
      const tooltip = tradeTooltipRef.current
      tooltip.style.left = `${point.x + 15}px`
      tooltip.style.top = `${point.y - 10}px`
      tooltip.style.display = 'block'
      tooltip.style.opacity = '1'
      
      // 格式化交易数据
      const tradeData = trade.tradeData
      const isProfitable = tradeData.profit_pct > 0
      const tradeType = tradeData.type === 'open' ? '开仓' : '平仓'
      
      tooltip.innerHTML = `
        <div class="font-medium text-${isProfitable ? 'green' : 'red'}-600">
          ${tradeType} - ${tradeData.pair}
        </div>
        <div class="text-sm text-gray-600">
          价格: ${tradeType === '开仓' ? tradeData.open_rate : tradeData.close_rate}
        </div>
        <div class="text-sm text-gray-600">
          时间: ${new Date(tradeType === '开仓' ? tradeData.open_date : tradeData.close_date).toLocaleString()}
        </div>
        ${tradeData.type === 'close' ? `
          <div class="text-sm font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}">
            盈亏: ${tradeData.profit_pct.toFixed(2)}%
          </div>
          <div class="text-sm text-gray-600">
            持仓: ${Math.floor(tradeData.trade_duration / 60)}分钟
          </div>
        ` : ''}
      `
    }
  }

  // 隐藏交易工具提示
  const hideTradeTooltip = () => {
    if (tradeTooltipRef.current) {
      tradeTooltipRef.current.style.display = 'none'
      tradeTooltipRef.current.style.opacity = '0'
    }
  }

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Default theme if not provided
    const defaultTheme = theme || {
      name: 'light',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      gridColor: '#f0f0f0',
      upColor: '#26a69a',
      downColor: '#ef5350',
      volumeUpColor: '#26a69a',
      volumeDownColor: '#ef5350',
      borderColor: '#f0f0f0',
      tooltipBackground: '#1a1a1a',
      tooltipText: '#ffffff'
    }

    // 创建图表实例
    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        textColor: defaultTheme.textColor,
        backgroundColor: defaultTheme.backgroundColor,
      },
      grid: {
        vertLines: { 
          color: showGrid ? defaultTheme.gridColor : 'transparent',
          style: LineStyle.Dashed,
        },
        horzLines: { 
          color: showGrid ? defaultTheme.gridColor : 'transparent',
          style: LineStyle.Dashed,
        },
      },
      crosshair: {
        mode: showCrosshair ? CrosshairMode.Normal : CrosshairMode.Magnet,
        vertLine: {
          width: 1,
          color: defaultTheme.borderColor,
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: defaultTheme.borderColor,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: defaultTheme.borderColor,
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: defaultTheme.borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // 创建K线系列
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: defaultTheme.upColor,
      downColor: defaultTheme.downColor,
      borderDownColor: defaultTheme.downColor,
      borderUpColor: defaultTheme.upColor,
      wickDownColor: defaultTheme.downColor,
      wickUpColor: defaultTheme.upColor,
    })

    seriesRef.current = candlestickSeries

    // 设置数据
    try {
      candlestickSeries.setData(data)
    } catch (err) {
      const chartError: ChartError = {
        type: 'DATA_ERROR',
        message: `Failed to set chart data: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'DATA_SET_FAILED',
        details: err,
        timestamp: new Date()
      }
        setError(chartError)
      onError?.(chartError)
      return
    }

    // 创建成交量系列（如果启用）
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: defaultTheme.volumeUpColor,
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      })
      volumeSeriesRef.current = volumeSeries

      // 设置成交量数据
      const volumeData = data.map(candle => ({
        time: candle.time,
        value: candle.volume || 0,
        color: candle.close >= candle.open ? defaultTheme.volumeUpColor : defaultTheme.volumeDownColor,
      }))
      volumeSeries.setData(volumeData)
    }

    // 添加交易标记
    if (tradeMarkers.length > 0) {
      const markersList = tradeMarkers.map(t => ({
        time: t.time,
        position: t.position,
        shape: t.shape,
        color: t.color,
        text: t.text,
        size: 1,
        tradeData: t.tradeData, // Ensure tradeData is included
      }))

      candlestickSeries.setMarkers(markersList)
      markersDataRef.current = markersList
    }

    // 订阅十字线移动事件
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const crosshairMoveParams: CrosshairMoveParams = {
        time: param.time,
        point: param.point,
        seriesData: param.seriesData,
        hoveredSeries: param.hoveredSeries,
        sourceEvent: param.sourceEvent,
      };
      onCrosshairMove?.(crosshairMoveParams);
      
      // 更新工具提示位置
      if (tooltipRef.current && param.point) {
        tooltipRef.current.style.left = `${param.point.x + 10}px`
        tooltipRef.current.style.top = `${param.point.y + 10}px`
      }
      
      // 检查是否悬停在交易标记上
      if (param.time && param.point) {
        const hoveredTrade = tradeMarkers.find(trade => trade.time === param.time)
        if (hoveredTrade) {
          showTradeTooltip(hoveredTrade, param.point)
        } else {
          hideTradeTooltip()
        }
      } else {
        hideTradeTooltip()
      }
    })

    // 点击事件处理
    chart.subscribeClick((param: MouseEventParams) => {
      if (param.point && param.time) {
        // 查找点击位置的交易标记
        const clickedTrade = tradeMarkers.find(trade =>
          trade.time === param.time
        )
        
        if (clickedTrade) {
          onTradeClick?.(clickedTrade.tradeData)
        }
      }
    })

    // 响应式处理
    const handleResize = () => {
      if (autoResize && chartContainerRef.current && chartRef.current) {
        const containerWidth = chartContainerRef.current.clientWidth
        chartRef.current.applyOptions({ width: containerWidth })
      }
    }

    if (autoResize) {
      window.addEventListener('resize', handleResize)
    }

    return () => {
      if (autoResize) {
        window.removeEventListener('resize', handleResize)
      }
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [data, tradeMarkers, width, height, onCrosshairMove, onTradeClick, showVolume, showGrid, theme, showCrosshair, autoResize, performanceMode])

  // 更新数据
  useEffect(() => {
    if (seriesRef.current) {
      try {
        seriesRef.current.setData(data)
        setError(null)
      } catch (err) {
        const chartError: ChartError = {
          type: 'DATA_ERROR',
          message: `Failed to update chart data: ${err instanceof Error ? err.message : 'Unknown error'}`,
          code: 'DATA_UPDATE_FAILED',
          details: err,
          timestamp: new Date()
        }
        setError(chartError)
        onError?.(chartError)
      }
    }
  }, [data])

  // 更新交易标记
  useEffect(() => {
    if (seriesRef.current && tradeMarkers.length > 0) {
      try {
        const mappedTrades = tradeMarkers.map(t => ({
          time: t.time,
          position: t.position,
          shape: t.shape,
          color: t.color,
          text: t.text,
          size: 1,
          tradeData: t.tradeData, // Ensure tradeData is included
        }))
        
        seriesRef.current.setMarkers(mappedTrades)
        markersDataRef.current = mappedTrades
        setError(null)
      } catch (err) {
        const chartError: ChartError = {
          type: 'DATA_ERROR',
          message: `Failed to update trade markers: ${err instanceof Error ? err.message : 'Unknown error'}`,
          code: 'MARKER_UPDATE_FAILED',
          details: err,
          timestamp: new Date()
        }
        setError(chartError)
        onError?.(chartError)
      }
    }
  }, [tradeMarkers])

  // Error boundary effect
  useEffect(() => {
    if (error) {
      console.error('Chart error:', error)
    }
  }, [error])

  return (
    <div className={`relative ${className}`}>
      {error && (
        <div className="absolute top-0 left-0 w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20">
          <strong className="font-bold">Chart Error:</strong>
          <span className="block sm:inline"> {error.message}</span>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
      <div 
        ref={tooltipRef}
        className="absolute top-0 left-0 bg-gray-900 text-white p-2 rounded shadow-lg text-sm pointer-events-none opacity-0 transition-opacity"
        style={{ display: 'none' }}
      >
        <div className="font-medium">价格信息</div>
        <div id="tooltip-content" />
      </div>
      <div 
        ref={tradeTooltipRef}
        className="absolute top-0 left-0 bg-gray-900 text-white p-3 rounded shadow-lg text-sm pointer-events-none opacity-0 transition-opacity z-10"
        style={{ display: 'none', minWidth: '200px' }}
      >
        {/* 交易提示内容将通过JavaScript动态填充 */}
      </div>
    </div>
  )
}