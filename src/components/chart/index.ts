// Core components
export { CandlestickChart } from '../CandlestickChart'
export { EnhancedTradingChart } from '../EnhancedTradingChart'

// Enhanced chart components
export { EnhancedChartContainer } from './EnhancedChartContainer'

// Theme system
export { 
  getChartTheme, 
  getChartOptions, 
  chartThemes,
  type ChartTheme 
} from './themes'

// Technical indicators
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolumeProfile,
  findSupportResistance,
  type IndicatorData,
  type TechnicalIndicator,
  type MovingAverageData,
  type RSIData,
  type MACDData,
  type BollingerBandsData,
  type VolumeProfileData,
  type SupportResistanceLevel,
} from './indicators'

// Drawing tools
export {
  DrawingManager,
  createDrawingTool,
  drawingTools,
  fibonacciLevels,
  snapToPoint,
  validateDrawingPoints,
  serializeDrawing,
  deserializeDrawing,
  type DrawingTool,
  type DrawingToolType,
  type DrawingToolConfig,
  type DrawingState,
  type DrawingAction,
  type Point,
} from './drawing-tools'

// Performance metrics
export {
  calculateTradeStatistics,
  calculateRiskMetrics,
  calculateEquityCurve,
  calculateTradeDistribution,
  calculateStreaks,
  calculateCompletePerformanceMetrics,
  type PerformanceMetrics,
  type TradeStatistics,
  type RiskMetrics,
  type EquityCurve,
  type TradeDistribution,
} from './performance-metrics'

// Keyboard shortcuts and gestures
export {
  KeyboardShortcutManager,
  GestureManager,
  getTouchCenter,
  getTouchDistance,
  isDoubleTap,
  type KeyboardShortcut,
  type GestureEvent,
  type TouchPoint,
} from './shortcuts-gestures'

// Responsive layout
export {
  ResponsiveContainer,
  ChartLayout,
  ResponsiveGrid,
  ResponsiveFlex,
  ResponsiveToolbar,
  ResponsivePanel,
  ResponsiveDrawer,
  ResponsiveModal,
  useBreakpoint,
  useMediaQuery,
  useResponsive,
  type ResponsiveLayoutProps,
  type ChartLayoutProps,
  type ResponsiveBreakpoints,
} from './responsive-layout'

// Accessibility and error handling
export {
  ChartErrorBoundary,
  LoadingState,
  ErrorPanel,
  AccessibleChartContainer,
  AccessibleButton,
  AccessibleSelect,
  useAnnouncements,
  useFocusTrap,
  ChartError,
  handleChartError,
  logError,
  usePerformanceMonitoring,
  getAriaLabelForValue,
  generateChartSummary,
  type AccessibilityProps,
  type ErrorBoundaryProps,
  type LoadingStateProps,
  type ErrorMessageProps,
  type ChartAccessibilityProps,
} from './accessibility'

// Performance optimization
export {
  DataCache,
  optimizeDataForRendering,
  downsampleData,
  useVirtualScroll,
  useDataWorker,
  useRAF,
  useDebounce,
  useThrottle,
  useMemoryOptimization,
  useDataStream,
  usePerformanceMonitoring as usePerfMonitoring,
  type CacheEntry,
  type PerformanceMetrics as PerfMetrics,
} from './performance'

// Types
export type { 
  CandlestickData,
  TradeMarker 
} from '../CandlestickChart'

// Import types from lightweight-charts package directly
import type {
  Time,
  SeriesMarkerPosition,
  SeriesMarkerShape,
  MouseEventParams,
  IChartApi,
  ISeriesApi,
  ChartOptions,
  SeriesDataItemTypeMap,
  CandlestickSeriesOptions,
} from 'lightweight-charts'

// Re-export the types
export type {
  Time,
  SeriesMarkerPosition,
  SeriesMarkerShape,
  MouseEventParams,
  IChartApi,
  ISeriesApi,
  ChartOptions,
  SeriesDataItemTypeMap,
  CandlestickSeriesOptions,
}