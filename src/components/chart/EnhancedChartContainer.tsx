'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createChart, IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts'
import { ChartTheme, getChartTheme, getChartOptions } from './themes'
import { CandlestickData, TradeMarker } from '../CandlestickChart'
import { TechnicalIndicator, calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from './indicators'
import { DrawingTool, DrawingManager, drawingTools } from './drawing-tools'
import { PerformanceMetrics, calculateCompletePerformanceMetrics } from './performance-metrics'
import { KeyboardShortcutManager, GestureManager } from './shortcuts-gestures'
import { ChartLayout, useResponsive } from './responsive-layout'
import { AccessibleChartContainer, ChartErrorBoundary, LoadingState, ErrorPanel } from './accessibility'
import { DataCache, usePerformanceMonitoring, useDebounce, useRAF } from './performance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Settings, 
  Palette, 
  Download, 
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Save,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { format } from 'date-fns'

interface EnhancedChartContainerProps {
  data: CandlestickData[]
  tradeMarkers?: TradeMarker[]
  width?: number
  height?: number
  theme?: ChartTheme
  onCrosshairMove?: (param: MouseEventParams) => void
  onTradeClick?: (tradeData: any) => void
  className?: string
  showVolume?: boolean
  showGrid?: boolean
  autoResize?: boolean
  performanceMode?: boolean
}

interface ChartState {
  indicators: TechnicalIndicator[]
  drawings: DrawingTool[]
  selectedDrawing: string | null
  isDrawing: boolean
  showVolume: boolean
  showGrid: boolean
  showCrosshair: boolean
  showLegend: boolean
  showToolbar: boolean
  performanceMetrics: PerformanceMetrics | null
  isLoading: boolean
  error: Error | null
}

export function EnhancedChartContainer({
  data,
  tradeMarkers = [],
  width = 800,
  height = 600,
  theme = getChartTheme('light'),
  onCrosshairMove,
  onTradeClick,
  className = '',
  showVolume = false,
  showGrid = true,
  autoResize = true,
  performanceMode = false,
}: EnhancedChartContainerProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const gestureManagerRef = useRef<GestureManager | null>(null)
  const shortcutManagerRef = useRef<KeyboardShortcutManager | null>(null)
  const drawingManagerRef = useRef<DrawingManager | null>(null)
  const dataCacheRef = useRef<DataCache>(new DataCache())
  
  const [state, setState] = useState<ChartState>({
    indicators: [],
    drawings: [],
    selectedDrawing: null,
    isDrawing: false,
    showVolume,
    showGrid,
    showCrosshair: true,
    showLegend: true,
    showToolbar: true,
    performanceMetrics: null,
    isLoading: false,
    error: null,
  })

  const [currentTheme, setCurrentTheme] = useState(theme)
  const [timeframe, setTimeframe] = useState('5m')
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { startRender, endRender } = usePerformanceMonitoring()

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const startTime = startRender()
    
    try {
      const chart = createChart(chartContainerRef.current, {
        ...getChartOptions(currentTheme),
        width,
        height,
      })

      chartRef.current = chart

      // Create candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: currentTheme.upColor,
        downColor: currentTheme.downColor,
        borderDownColor: currentTheme.downColor,
        borderUpColor: currentTheme.upColor,
        wickDownColor: currentTheme.downColor,
        wickUpColor: currentTheme.upColor,
      })

      seriesRef.current = candlestickSeries

      // Set data
      if (data.length > 0) {
        candlestickSeries.setData(data as any)
      }

      // Create volume series
      if (state.showVolume) {
        const volumeSeries = chart.addHistogramSeries({
          color: currentTheme.volumeUpColor,
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
        })
        volumeSeriesRef.current = volumeSeries

        const volumeData = data.map(candle => ({
          time: candle.time,
          value: candle.volume || 0,
          color: candle.close >= candle.open ? currentTheme.volumeUpColor : currentTheme.volumeDownColor,
        }))
        volumeSeries.setData(volumeData)
      }

      // Add trade markers
      if (tradeMarkers.length > 0) {
        const markers = tradeMarkers.map(t => ({
          time: t.time,
          position: t.position,
          shape: t.shape,
          color: t.color,
          text: t.text,
          size: 1,
        }))
        candlestickSeries.setMarkers(markers)
      }

      // Subscribe to events
      chart.subscribeCrosshairMove((param: MouseEventParams) => {
        onCrosshairMove?.(param)
      })

      chart.subscribeClick((param: MouseEventParams) => {
        if (param.point && param.time) {
          const clickedTrade = tradeMarkers.find(trade => trade.time === param.time)
          if (clickedTrade) {
            onTradeClick?.(clickedTrade.tradeData)
          }
        }
      })

      // Initialize gesture manager
      if (chartContainerRef.current) {
        gestureManagerRef.current = new GestureManager(chartContainerRef.current)
        gestureManagerRef.current.on('pan', (event) => {
          // Handle pan gesture
          chart.timeScale().scrollToPosition(event.deltaX || 0, true)
        })
        gestureManagerRef.current.on('zoom', (event) => {
          // Handle zoom gesture
          chart.timeScale().setVisibleRange({
            from: data[0]?.time || 0,
            to: data[data.length - 1]?.time || Date.now(),
          })
        })
      }

      // Initialize keyboard shortcut manager
      shortcutManagerRef.current = new KeyboardShortcutManager()

      // Initialize drawing manager
      drawingManagerRef.current = new DrawingManager()
      drawingManagerRef.current.subscribe((drawingState) => {
        setState(prev => ({
          ...prev,
          drawings: drawingState.drawings,
          selectedDrawing: drawingState.selectedDrawing,
          isDrawing: drawingState.isDrawing,
        }))
      })

      // Calculate performance metrics
      if (data.length > 0) {
        const metrics = calculateCompletePerformanceMetrics(
          tradeMarkers.map(t => t.tradeData).filter(Boolean),
          10000
        )
        setState(prev => ({ ...prev, performanceMetrics: metrics }))
      }

      endRender(startTime, data.length)

    } catch (error) {
      console.error('Failed to initialize chart:', error)
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }))
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
      }
      if (gestureManagerRef.current) {
        gestureManagerRef.current.destroy()
      }
    }
  }, [data, currentTheme, state.showVolume, tradeMarkers])

  // Handle auto-resize
  useEffect(() => {
    if (!autoResize || !chartRef.current) return

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const containerWidth = chartContainerRef.current.clientWidth
        chartRef.current.applyOptions({ width: containerWidth })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [autoResize])

  // Add technical indicators
  const addIndicator = useCallback((type: string, settings: any = {}) => {
    if (!seriesRef.current) return

    let indicator: TechnicalIndicator | null = null

    switch (type) {
      case 'sma':
        const smaData = calculateSMA(data, settings.period || 20)
        indicator = {
          id: `sma_${Date.now()}`,
          name: `SMA(${settings.period || 20})`,
          type: 'overlay',
          data: smaData,
          color: settings.color || '#3b82f6',
          visible: true,
          settings,
        }
        break
      case 'ema':
        const emaData = calculateEMA(data, settings.period || 20)
        indicator = {
          id: `ema_${Date.now()}`,
          name: `EMA(${settings.period || 20})`,
          type: 'overlay',
          data: emaData,
          color: settings.color || '#10b981',
          visible: true,
          settings,
        }
        break
      case 'rsi':
        const rsiData = calculateRSI(data, settings.period || 14)
        indicator = {
          id: `rsi_${Date.now()}`,
          name: `RSI(${settings.period || 14})`,
          type: 'oscillator',
          data: rsiData,
          color: settings.color || '#f59e0b',
          visible: true,
          settings,
        }
        break
      case 'macd':
        const macdData = calculateMACD(data)
        indicator = {
          id: `macd_${Date.now()}`,
          name: 'MACD',
          type: 'oscillator',
          data: macdData,
          color: settings.color || '#8b5cf6',
          visible: true,
          settings,
        }
        break
      case 'bollinger':
        const bbData = calculateBollingerBands(data)
        indicator = {
          id: `bb_${Date.now()}`,
          name: 'Bollinger Bands',
          type: 'overlay',
          data: bbData,
          color: settings.color || '#ef4444',
          visible: true,
          settings,
        }
        break
    }

    if (indicator) {
      setState(prev => ({
        ...prev,
        indicators: [...prev.indicators, indicator],
      }))
    }
  }, [data])

  // Remove indicator
  const removeIndicator = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      indicators: prev.indicators.filter(i => i.id !== id),
    }))
  }, [])

  // Toggle indicator visibility
  const toggleIndicator = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      indicators: prev.indicators.map(i => 
        i.id === id ? { ...i, visible: !i.visible } : i
      ),
    }))
  }, [])

  // Theme management
  const changeTheme = useCallback((themeName: string) => {
    const newTheme = getChartTheme(themeName)
    setCurrentTheme(newTheme)
    
    if (chartRef.current) {
      chartRef.current.applyOptions(getChartOptions(newTheme))
    }
  }, [])

  // Toolbar controls
  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-gray-50 dark:bg-gray-800">
      {/* Time frame selector */}
      <Tabs value={timeframe} onValueChange={setTimeframe}>
        <TabsList>
          <TabsTrigger value="1m">1m</TabsTrigger>
          <TabsTrigger value="5m">5m</TabsTrigger>
          <TabsTrigger value="15m">15m</TabsTrigger>
          <TabsTrigger value="1h">1h</TabsTrigger>
          <TabsTrigger value="4h">4h</TabsTrigger>
          <TabsTrigger value="1d">1d</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Drawing tools */}
      <div className="flex items-center gap-1">
        {drawingTools.slice(0, 5).map(tool => (
          <Button
            key={tool.type}
            variant={selectedTool === tool.type ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool(selectedTool === tool.type ? null : tool.type)}
            title={tool.description}
          >
            <MousePointer className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addIndicator('sma', { period: 20 })}
        >
          SMA
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addIndicator('ema', { period: 20 })}
        >
          EMA
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addIndicator('rsi')}
        >
          RSI
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addIndicator('macd')}
        >
          MACD
        </Button>
      </div>

      {/* View options */}
      <div className="flex items-center gap-1">
        <Button
          variant={state.showVolume ? "default" : "outline"}
          size="sm"
          onClick={() => setState(prev => ({ ...prev, showVolume: !prev.showVolume }))}
        >
          Volume
        </Button>
        <Button
          variant={state.showGrid ? "default" : "outline"}
          size="sm"
          onClick={() => setState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
        >
          Grid
        </Button>
      </div>

      {/* Theme selector */}
      <select
        value={currentTheme.name}
        onChange={(e) => changeTheme(e.target.value)}
        className="px-2 py-1 border rounded text-sm"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="tradingview">TradingView</option>
        <option value="professional">Professional</option>
      </select>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Export chart as image
            const canvas = chartContainerRef.current?.querySelector('canvas')
            if (canvas) {
              const link = document.createElement('a')
              link.download = `chart-${Date.now()}.png`
              link.href = canvas.toDataURL()
              link.click()
            }
          }}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

  // Performance metrics panel
  const PerformancePanel = () => {
    if (!state.performanceMetrics) return null

    const metrics = state.performanceMetrics

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Trades</p>
              <p className="font-medium">{metrics.totalTrades}</p>
            </div>
            <div>
              <p className="text-gray-600">Win Rate</p>
              <p className={`font-medium ${metrics.winRate > 50 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.winRate.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-600">Net Profit</p>
              <p className={`font-medium ${metrics.netProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.netProfit.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Profit Factor</p>
              <p className="font-medium">{metrics.profitFactor.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Max Drawdown</p>
              <p className="font-medium text-red-600">{metrics.maxDrawdown.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-600">Sharpe Ratio</p>
              <p className="font-medium">{metrics.sharpeRatio.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Indicators panel
  const IndicatorsPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {state.indicators.map(indicator => (
            <div key={indicator.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: indicator.color }}
                />
                <span className="text-sm">{indicator.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleIndicator(indicator.id)}
                >
                  {indicator.visible ? '👁️' : '👁️‍🗨️'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIndicator(indicator.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {state.indicators.length === 0 && (
            <p className="text-sm text-gray-500">No indicators added</p>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ChartErrorBoundary>
      <AccessibleChartContainer
        chartTitle="Trading Chart"
        chartDescription="Interactive candlestick chart with technical indicators and drawing tools"
        shortcutsHelp="Use keyboard shortcuts for quick actions. Press ? to see all shortcuts."
        dataSummary={`${data.length} data points loaded`}
      >
        <ChartLayout
          chart={
            <div
              ref={chartContainerRef}
              className={`w-full h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}
            />
          }
          toolbar={state.showToolbar && <Toolbar />}
          indicators={<IndicatorsPanel />}
          performance={<PerformancePanel />}
          className={className}
        />
      </AccessibleChartContainer>
    </ChartErrorBoundary>
  )
}