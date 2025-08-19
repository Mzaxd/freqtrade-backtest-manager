'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle, PriceScaleMode } from 'lightweight-charts'
import type {
  ChartOptions,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  Time,
  CandlestickData as CandlestickDataType,
  CandlestickSeriesOptions,
  SeriesDataItemTypeMap,
  SeriesMarkerPosition,
  SeriesMarkerShape
} from 'lightweight-charts'

export type CandlestickData = SeriesDataItemTypeMap['Candlestick'] & {
  volume?: number
};

export interface TradeMarker {
  time: Time
  position: SeriesMarkerPosition
  shape: SeriesMarkerShape
  color: string
  text: string
  tradeData: any
}

export interface ChartProps {
  data: CandlestickData[]
  tradeMarkers?: TradeMarker[]
  width?: number
  height?: number
  onCrosshairMove?: (param: MouseEventParams) => void
  onTradeClick?: (tradeData: any) => void
  showVolume?: boolean
  showGrid?: boolean
}

export function CandlestickChart({ 
  data, 
  tradeMarkers = [],
  width = 800,
  height = 600,
  onCrosshairMove,
  onTradeClick,
  showVolume = false,
  showGrid = true 
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersDataRef = useRef<any[]>([])
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tradeTooltipRef = useRef<HTMLDivElement>(null)

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

    // 创建图表实例
    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
        backgroundColor: '#ffffff',
      },
      grid: {
        vertLines: { 
          color: showGrid ? '#f0f0f0' : 'transparent',
          style: LineStyle.Dashed,
        },
        horzLines: { 
          color: showGrid ? '#f0f0f0' : 'transparent',
          style: LineStyle.Dashed,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#758696',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#f0f0f0',
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: '#f0f0f0',
        timeVisible: true,
        secondsVisible: false,
      },
    } as ChartOptions)

    chartRef.current = chart

    // 创建K线系列
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    })

    seriesRef.current = candlestickSeries

    // 设置数据
    candlestickSeries.setData(data)

    // 创建成交量系列（如果启用）
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
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
        color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
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
      }))

      candlestickSeries.setMarkers(markersList)
      markersDataRef.current = markersList
    }

    // 订阅十字线移动事件
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      onCrosshairMove?.(param)
      
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
      if (chartContainerRef.current && chartRef.current) {
        const containerWidth = chartContainerRef.current.clientWidth
        chartRef.current.applyOptions({ width: containerWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, tradeMarkers, width, height, onCrosshairMove, onTradeClick, showVolume, showGrid])

  // 更新数据
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData(data as any)
    }
  }, [data])

  // 更新交易标记
  useEffect(() => {
    if (seriesRef.current && tradeMarkers.length > 0) {
      const mappedTrades = tradeMarkers.map(t => ({
        time: t.time,
        position: t.position,
        shape: t.shape,
        color: t.color,
        text: t.text,
        size: 1,
      }))
      
      seriesRef.current.setMarkers(mappedTrades)
      markersDataRef.current = mappedTrades
    }
  }, [tradeMarkers])

  return (
    <div className="relative">
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