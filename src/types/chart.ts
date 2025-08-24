/**
 * Comprehensive TypeScript interfaces for trading chart components
 * These interfaces provide type safety for all chart-related data structures
 */

import type { Time, SeriesMarkerPosition as LWCSeriesMarkerPosition, SeriesMarkerShape as LWCSeriesMarkerShape } from 'lightweight-charts'

// ===== OHLCV Data Types =====

/**
 * Standard OHLCV (Open, High, Low, Close, Volume) candlestick data
 */
export interface OHLCVData {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Extended candlestick data with additional technical analysis fields
 */
export interface ExtendedCandlestickData extends OHLCVData {
  /** Trading volume */
  volume: number
  /** Price change from previous close */
  change?: number
  /** Percentage change from previous close */
  changePercent?: number
  /** Typical price (H+L+C)/3 */
  typicalPrice?: number
  /** Weighted close price (H+L+C+C)/4 */
  weightedClose?: number
  /** Average true range */
  atr?: number
}

/**
 * Trade data from backtest results
 */
export interface TradeData {
  pair: string
  open_date: string
  close_date: string
  profit_abs: number
  profit_pct: number
  profit_ratio?: number // Added for compatibility with raw results
  open_rate: number
  close_rate: number
  amount: number
  stake_amount: number
  trade_duration: number
  exit_reason: string
  open_timestamp: number // Added from raw results
  close_timestamp: number // Added from raw results
  /** Trade ID for database reference */
  id?: string
  /** Strategy used for this trade */
  strategy?: string
  /** Whether trade was profitable */
  isProfitable?: boolean
  /** Trade type: 'open' or 'close' - for chart markers */
  type?: 'open' | 'close'
}

/**
 * Trade marker data for chart display
 */
export type SeriesMarkerPosition = LWCSeriesMarkerPosition;
export type SeriesMarkerShape = LWCSeriesMarkerShape;
export interface TradeMarker {
  time: Time
  position: SeriesMarkerPosition
  shape: SeriesMarkerShape
  color: string
  text: string
  tradeData: TradeData & {
    /** Trade type: 'open' or 'close' */
    type: 'open' | 'close'
  }
}

// ===== Chart Configuration Types =====

/**
 * Chart display options
 */
export interface ChartOptions {
  width?: number
  height?: number
  theme?: ChartTheme
  showVolume?: boolean
  showGrid?: boolean
  showCrosshair?: boolean
  showLegend?: boolean
  showToolbar?: boolean
  autoResize?: boolean
  performanceMode?: boolean
}

/**
 * Chart theme configuration
 */
export interface ChartTheme {
  name: string
  backgroundColor: string
  textColor: string
  gridColor: string
  upColor: string
  downColor: string
  volumeUpColor: string
  volumeDownColor: string
  borderColor: string
  tooltipBackground: string
  tooltipText: string
}

/**
 * Chart event handlers
 */
export interface ChartEventHandlers {
  onCrosshairMove?: (param: CrosshairMoveParams) => void
  onTradeClick?: (tradeData: TradeData & { type: 'open' | 'close' }) => void
  onDataUpdate?: (data: ExtendedCandlestickData[]) => void
  onError?: (error: ChartError) => void
  onThemeChange?: (theme: ChartTheme) => void
}

/**
 * Crosshair move event parameters
 */
export interface CrosshairMoveParams {
  time?: Time
  point?: { x: number; y: number }
  seriesData?: Map<string, unknown>
  hoveredSeries?: unknown
  sourceEvent?: MouseEvent | TouchEvent
}

/**
 * Chart error types
 */
export interface ChartError {
  type: 'DATA_ERROR' | 'RENDER_ERROR' | 'CONFIG_ERROR' | 'NETWORK_ERROR'
  message: string
  code?: string
  details?: unknown
  timestamp: Date
}

// ===== Technical Analysis Types =====

/**
 * Technical indicator interface
 */
export interface TechnicalIndicator {
  id: string
  name: string
  type: 'overlay' | 'oscillator' | 'volume'
  data: IndicatorDataPoint[]
  color: string
  visible: boolean
  settings: IndicatorSettings
}

/**
 * Single data point for technical indicators
 */
export interface IndicatorDataPoint {
  time: Time
  value: number
  /** Optional additional values for multi-line indicators */
  value2?: number
  /** Optional signal value */
  signal?: number
}

/**
 * Indicator settings configuration
 */
export interface IndicatorSettings {
  period?: number
  multiplier?: number
  color?: string
  lineWidth?: number
  /** Standard deviation for Bollinger Bands */
  stdDev?: number
  /** Fast period for MACD */
  fastPeriod?: number
  /** Slow period for MACD */
  slowPeriod?: number
  /** Signal period for MACD */
  signalPeriod?: number
  /** Overbought level for oscillators */
  overbought?: number
  /** Oversold level for oscillators */
  oversold?: number
}

/**
 * Supported technical indicator types
 */
export type IndicatorType = 
  | 'sma'   // Simple Moving Average
  | 'ema'   // Exponential Moving Average
  | 'rsi'   // Relative Strength Index
  | 'macd'  // Moving Average Convergence Divergence
  | 'bollinger' // Bollinger Bands
  | 'stoch' // Stochastic Oscillator
  | 'atr'   // Average True Range
  | 'adx'   // Average Directional Index

// ===== Performance Metrics Types =====

/**
 * Trading performance metrics
 */
export interface PerformanceMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  netProfit: number
  grossProfit: number
  grossLoss: number
  profitFactor: number
  maxDrawdown: number
  maxDrawdownDuration: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  averageTrade: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  longestWinStreak: number
  longestLossStreak: number
  totalFees: number
  startingBalance: number
  endingBalance: number
  totalReturn: number
  annualizedReturn: number
  volatility: number
}

// ===== Chart Component Props =====

/**
 * Props for CandlestickChart component
 */
export interface CandlestickChartProps {
  data: ExtendedCandlestickData[]
  tradeMarkers?: TradeMarker[]
  width?: number
  height?: number
  theme?: ChartTheme
  onCrosshairMove?: (param: CrosshairMoveParams) => void
  onTradeClick?: (tradeData: TradeData & { type: 'open' | 'close' }) => void
  showVolume?: boolean
  showGrid?: boolean
  showToolbar?: boolean
  autoResize?: boolean
  performanceMode?: boolean
  className?: string
}

/**
 * Props for EnhancedTradingChart component
 */
export interface EnhancedTradingChartProps {
  backtestId: string
  initialData?: ChartData
  className?: string
  theme?: ChartTheme
  availableTimeframes?: string[]
  defaultTimeframe?: string
}

/**
 * Combined chart data structure
 */
export interface ChartData {
  candles: OHLCVData[]
  trades: TradeData[]
  timeframe?: string
  pair?: string
  startTime?: Date
  endTime?: Date
}

/**
 * Interface for the `data` field of the Config model,
 * which stores configuration parameters.
 */
export interface ConfigData {
  timeframe?: string;
  [key: string]: any; // Allow for arbitrary additional properties
}

// ===== Backtest Metadata Types =====

/**
 * Backtest task metadata
 */
export interface BacktestMeta {
  id: string
  name: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  trades?: TradeData[]
  strategy?: {
    name: string
    className: string
    description?: string
  }
  config?: {
    name: string
    timeframe: string
    stakeAmount?: number
    maxOpenTrades?: number
  }
  createdAt: string
  completedAt?: string
  duration?: number
  timerangeStart?: string
  timerangeEnd?: string
  resultsSummary?: BacktestResultsSummary
}

/**
 * Backtest results summary
 */
export interface BacktestResultsSummary {
  [key: string]: any; // 添加索引签名以兼容 Prisma.InputJsonObject
  total_trades: number
  wins: number
  losses: number
  draws: number
  profit_total: number
  profit_total_abs: number
  stake_currency: string
  avg_duration: string
  best_pair: { pair: string; profit_sum: number; profit_sum_pct: number; } | null
  worst_pair: { pair: string; profit_sum: number; profit_sum_pct: number; } | null
  max_drawdown?: number
  win_rate?: number
  profit_factor?: number
}

// ===== API Response Types =====

/**
 * API response for chart data
 */
export interface ChartDataResponse {
  candles: ExtendedCandlestickData[]
  trades: TradeData[]
  timeframe: string
  pair: string
  metadata?: {
    totalCandles: number
    totalTrades: number
    dateRange: {
      start: Date
      end: Date
    }
  }
}

/**
 * API error response
 */
export interface APIErrorResponse {
  error: string
  type: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'UNKNOWN_ERROR'
  code?: string
  details?: unknown
  timestamp: Date
}

/**
 * API success response wrapper
 */
export interface APISuccessResponse<T> {
  data: T
  success: boolean
  timestamp: Date
}

// ===== Utility Types =====

/**
 * Time range for chart data filtering
 */
export interface TimeRange {
  start: Date | Time
  end: Date | Time
}

/**
 * Chart drawing tools configuration
 */
export interface DrawingToolsConfig {
  enabled: boolean
  activeTool?: DrawingToolType
  tools: DrawingTool[]
}

/**
 * Drawing tool types
 */
export type DrawingToolType = 
  | 'trendline'
  | 'horizontal'
  | 'vertical'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'fibonacci'

/**
 * Individual drawing tool
 */
export interface DrawingTool {
  type: DrawingToolType
  name: string
  description: string
  icon?: string
  settings?: Record<string, unknown>
}

/**
 * Chart export options
 */
export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'svg'
  quality?: number
  width?: number
  height?: number
  includeToolbar?: boolean
  includeIndicators?: boolean
}

/**
 * Chart keyboard shortcuts
 */
export interface ChartShortcuts {
  [key: string]: {
    description: string
    action: () => void
    category: 'navigation' | 'tools' | 'view' | 'export'
  }
}

// ===== Type Guards =====

/**
 * Type guard for OHLCV data
 */
export function isOHLCVData(data: unknown): data is OHLCVData {
  return (
    typeof data === 'object' && 
    data !== null &&
    'time' in data &&
    'open' in data &&
    'high' in data &&
    'low' in data &&
    'close' in data &&
    typeof (data as OHLCVData).open === 'number' &&
    typeof (data as OHLCVData).high === 'number' &&
    typeof (data as OHLCVData).low === 'number' &&
    typeof (data as OHLCVData).close === 'number'
  )
}

/**
 * Type guard for trade data
 */
export function isTradeData(data: unknown): data is TradeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'pair' in data &&
    'open_date' in data &&
    'close_date' in data &&
    'profit_abs' in data &&
    'profit_pct' in data &&
    typeof (data as TradeData).pair === 'string' &&
    typeof (data as TradeData).profit_abs === 'number' &&
    typeof (data as TradeData).profit_pct === 'number'
  )
}

/**
 * Type guard for chart error
 */
export function isChartError(error: unknown): error is ChartError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'timestamp' in error &&
    typeof (error as ChartError).message === 'string' &&
    (error as ChartError).timestamp instanceof Date
  )
}