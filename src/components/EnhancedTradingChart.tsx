'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { TradeMarker } from '@/types/chart'
import { Time } from 'lightweight-charts'
import { EnhancedChartContainer } from './chart/EnhancedChartContainer'
import { ChartTheme, getChartTheme } from './chart/themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Download, ZoomIn, ZoomOut, Move3D, Settings, Palette, TrendingUp, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { TradeData, ChartData, BacktestMeta, CrosshairMoveParams, OHLCVData } from '@/types/chart'

interface EnhancedChartProps {
  backtestId: string
  initialData?: ChartData
  className?: string
}

const DynamicCandlestickChart = dynamic(
  () => import('./CandlestickChart').then(mod => mod.CandlestickChart),
  { ssr: false }
)

export function EnhancedTradingChart({ backtestId, initialData, className }: EnhancedChartProps) {
  const [chartData, setChartData] = useState<ChartData>(initialData || { candles: [], trades: [] })
  const [selectedTrade, setSelectedTrade] = useState<TradeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('5m')
  const [showVolume, setShowVolume] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [availablePairs, setAvailablePairs] = useState<string[]>([])
  const [selectedPair, setSelectedPair] = useState<string>('')
  const [backtestMeta, setBacktestMeta] = useState<BacktestMeta | null>(null)
  const [currentTheme, setCurrentTheme] = useState<ChartTheme>(getChartTheme('light'))
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
 
   // 转换交易数据为标记
  const convertTradesToMarkers = (trades: TradeData[]): TradeMarker[] => {
    const markers = trades.map((trade) => {
      const openTime = Math.floor(new Date(trade.open_date).getTime() / 1000) as Time
      const closeTime = Math.floor(new Date(trade.close_date).getTime() / 1000) as Time
      
      const isProfitable = trade.profit_pct > 0
      
      return [
        {
          time: openTime,
          position: 'belowBar',
          shape: 'arrowUp',
          color: isProfitable ? '#26a69a' : '#ef5350',
          text: '开',
          tradeData: { ...trade, type: 'open' as 'open' }
        },
        {
          time: closeTime,
          position: 'aboveBar',
          shape: 'arrowDown',
          color: isProfitable ? '#26a69a' : '#ef5350',
          text: '平',
          tradeData: { ...trade, type: 'close' as 'close' }
        }
      ]
    }).flat()
    
    // 按时间升序排序标记
    return markers.sort((a, b) => {
      const timeA = typeof a.time === 'string' ? parseInt(a.time) : a.time as number;
      const timeB = typeof b.time === 'string' ? parseInt(b.time) : b.time as number;
      return timeA - timeB;
    })
  }

  const tradeMarkers = convertTradesToMarkers(chartData.trades)

  const handleTradeClick = (tradeData: TradeData & { type: 'open' | 'close' }) => {
    setSelectedTrade(tradeData)
  }

  const handleCrosshairMove = (param: CrosshairMoveParams) => {
    // 可以在这里添加十字线移动的逻辑
    if (param.seriesData && param.seriesData.size > 0) {
      const key = param.seriesData.keys().next().value;
      if (key) {
        const data = param.seriesData.get(key)
        if (data) {
          // 更新工具提示内容
          const tooltip = document.getElementById('tooltip-content')
          if (tooltip && typeof data === 'object' && data !== null) {
            // 使用 OHLCVData 接口来确保类型安全
            const candleData = data as OHLCVData
            tooltip.innerHTML = `
              <div>开: ${candleData.open ?? 'N/A'}</div>
              <div>高: ${candleData.high ?? 'N/A'}</div>
              <div>低: ${candleData.low ?? 'N/A'}</div>
              <div>收: ${candleData.close ?? 'N/A'}</div>
            `
          }
        }
      }
    }
  }

  const handleRefresh = async () => {
    // Prevent multiple concurrent refreshes
    if (loading) return;
    
    setLoading(true);
    try {
        // First, get backtest metadata to populate pair list
        if (availablePairs.length === 0) {
            const metaResponse = await fetch(`/api/backtests/${backtestId}`);
            if (metaResponse.ok) {
                const backtest = await metaResponse.json();
                setBacktestMeta(backtest);
                const pairs = [...new Set(backtest.trades?.map((trade: TradeData) => trade.pair) || [])] as string[];
                setAvailablePairs(pairs);
                // If a pair is not selected yet, or the selected one is not in the new list, default to the first one
                if (pairs.length > 0 && !pairs.includes(selectedPair)) {
                    setSelectedPair(pairs[0]);
                }
            } else {
                 console.error('Failed to fetch backtest metadata');
                 return;
            }
        }

        // Then, if a pair is selected, fetch its chart data
        if (selectedPair) {
            const response = await fetch(`/api/backtests/${backtestId}/chart-data?timeframe=${timeframe}&pair=${selectedPair}`);
            if (response.ok) {
                const data = await response.json();
                setChartData(data);
            } else {
                console.error('Failed to fetch chart data for pair:', selectedPair);
                setChartData({ candles: [], trades: [] }); // Clear data on error
            }
        }
    } catch (error) {
        console.error('Failed to refresh chart data:', error);
    } finally {
        setLoading(false);
    }
  }

  const handleExport = async () => {
    const chartContainer = document.querySelector('.trading-view-widget')
    if (chartContainer) {
      try {
        // Dynamically import html2canvas
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(chartContainer as HTMLElement)
        const link = document.createElement('a')
        link.download = `backtest-${backtestId}-${selectedPair}-${timeframe}.png`
        link.href = canvas.toDataURL()
        link.click()
      } catch (error) {
        console.error('Failed to export chart:', error)
        alert('导出失败，请确保浏览器支持此功能')
      }
    }
  }

  // 组件加载时立即获取数据
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const initializeChart = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        // 首先获取回测元数据以填充交易对列表
        const metaResponse = await fetch(`/api/backtests/${backtestId}`, {
          signal: abortController.signal
        });
        
        if (metaResponse.ok && isMounted) {
          const backtest = await metaResponse.json();
          setBacktestMeta(backtest);
          const pairs = [...new Set(backtest.trades?.map((trade: TradeData) => trade.pair) || [])] as string[];
          setAvailablePairs(pairs);
          
          // 如果没有选中的交易对或者选中的不在新列表中，默认选择第一个
          if (pairs.length > 0 && !pairs.includes(selectedPair)) {
            setSelectedPair(pairs[0]);
          }
        }
        
        // 如果有选中的交易对，立即获取其图表数据
        if (selectedPair && isMounted) {
          const response = await fetch(`/api/backtests/${backtestId}/chart-data?timeframe=${timeframe}&pair=${selectedPair}`, {
            signal: abortController.signal
          });
          if (response.ok) {
            const data = await response.json();
            setChartData(data);
          } else {
            console.error('Failed to fetch chart data for pair:', selectedPair);
            setChartData({ candles: [], trades: [] });
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && isMounted) {
          console.error('Failed to initialize chart:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeChart();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [backtestId]); // 仅在backtestId变化时重新初始化

  // 当时间框架或交易对变化时，刷新数据
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const refreshData = async () => {
      if (!isMounted || !selectedPair || availablePairs.length === 0) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/backtests/${backtestId}/chart-data?timeframe=${timeframe}&pair=${selectedPair}`, {
          signal: abortController.signal
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          setChartData(data);
        } else if (isMounted) {
          console.error('Failed to fetch chart data for pair:', selectedPair);
          setChartData({ candles: [], trades: [] });
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && isMounted) {
          console.error('Failed to refresh chart data:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    refreshData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [timeframe, selectedPair, availablePairs.length, backtestId]);
 
   return (
    <div className={`space-y-4 ${className}`}>
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              交易分析图表
              {selectedPair && (
                <Badge variant="outline">{selectedPair}</Badge>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* 交易对选择 */}
              {availablePairs.length > 0 && (
                <select 
                  value={selectedPair} 
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  {availablePairs.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedControls(!showAdvancedControls)}
              >
                <Settings className="h-4 w-4 mr-1" />
                高级
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const themes = ['light', 'dark', 'tradingview', 'professional']
                  const currentIndex = themes.indexOf(currentTheme.name.toLowerCase())
                  const nextTheme = themes[(currentIndex + 1) % themes.length]
                  setCurrentTheme(getChartTheme(nextTheme))
                }}
              >
                <Palette className="h-4 w-4 mr-1" />
                主题
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 主图表区域 */}
      <Card>
        <CardContent className="p-0">
          <div className="trading-view-widget">
            <EnhancedChartContainer
              data={chartData.candles}
              tradeMarkers={tradeMarkers}
              height={600}
              onCrosshairMove={handleCrosshairMove}
              onTradeClick={handleTradeClick}
              showVolume={showVolume}
              showGrid={showGrid}
              theme={currentTheme}
              performanceMode={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* 交易详情面板 */}
      {selectedTrade && (
        <Card>
          <CardHeader>
            <CardTitle>交易详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">交易对</p>
                <p className="font-medium">{selectedTrade.pair}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">开仓价格</p>
                <p className="font-medium">{selectedTrade.open_rate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">平仓价格</p>
                <p className="font-medium">{selectedTrade.close_rate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">盈亏</p>
                <p className={`font-medium ${selectedTrade.profit_pct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedTrade.profit_pct.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">开仓时间</p>
                <p className="font-medium">{format(new Date(selectedTrade.open_date), 'yyyy-MM-dd HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">平仓时间</p>
                <p className="font-medium">{format(new Date(selectedTrade.close_date), 'yyyy-MM-dd HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">持仓时长</p>
                <p className="font-medium">{Math.floor(selectedTrade.trade_duration / 60)}分钟</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">平仓原因</p>
                <Badge variant="outline">{selectedTrade.exit_reason}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 图例说明 */}
      <Card>
        <CardHeader>
          <CardTitle>图例说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500"></div>
              <span className="text-sm">上涨K线</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500"></div>
              <span className="text-sm">下跌K线</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm">盈利开仓</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm">亏损开仓</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-green-500"></div>
              <span className="text-sm">盈利平仓</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-red-500"></div>
              <span className="text-sm">亏损平仓</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}