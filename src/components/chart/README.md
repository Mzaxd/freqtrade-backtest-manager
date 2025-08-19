# Enhanced K-Line Chart System

A comprehensive, production-ready K-line chart system built with React, TypeScript, and TradingView Lightweight Charts. This system provides professional trading platform functionality with advanced features, performance optimizations, and accessibility support.

## Features

### 🎨 **Theme System**
- **Multiple Themes**: Light, Dark, TradingView, Professional themes
- **Dynamic Theme Switching**: Real-time theme changes without re-rendering
- **Customizable Colors**: Full control over chart colors and styling
- **Consistent UI**: Theme-aware components and panels

### 📊 **Technical Indicators**
- **Moving Averages**: SMA, EMA with customizable periods
- **Oscillators**: RSI, MACD with signal lines and histograms
- **Volatility Bands**: Bollinger Bands with standard deviations
- **Volume Analysis**: Volume profile and on-balance volume
- **Support/Resistance**: Automatic level detection and strength analysis

### 🎯 **Drawing Tools**
- **Trend Analysis**: Trend lines, channels, pitchforks
- **Geometric Shapes**: Rectangles, circles, ellipses
- **Fibonacci Tools**: Retracement levels with automatic calculations
- **Annotations**: Text labels, arrows, and markers
- **State Management**: Persistent drawing storage and retrieval

### 📈 **Performance Analytics**
- **Trade Statistics**: Win rate, profit factor, average returns
- **Risk Metrics**: Sharpe ratio, maximum drawdown, sortino ratio
- **Equity Curve**: Visual representation of account growth
- **Trade Distribution**: Profit/loss distribution analysis
- **Streak Analysis**: Win/loss streak tracking

### ⌨️ **Keyboard Shortcuts**
- **Navigation**: Arrow keys for panning, +/- for zooming
- **Drawing Tools**: Quick access to all drawing tools (T, H, V, R, C, F)
- **Chart Controls**: Toggle volume, grid, indicators (Ctrl+V, Ctrl+G, Ctrl+I)
- **Time Frames**: Quick timeframe switching (1, 5, 6, 4, D keys)

### 📱 **Responsive Design**
- **Mobile-First**: Optimized for touch devices and small screens
- **Adaptive Layout**: Dynamic panel arrangement based on screen size
- **Gesture Support**: Pinch zoom, pan, and touch interactions
- **Breakpoint System**: Responsive behavior for all device sizes

### ♿ **Accessibility**
- **Screen Reader Support**: ARIA labels and live regions
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus trapping and management
- **Error Handling**: Comprehensive error boundaries and recovery
- **Performance Monitoring**: Real-time performance metrics

### 🚀 **Performance Optimizations**
- **Data Caching**: Intelligent caching with TTL and size limits
- **Virtual Scrolling**: Efficient rendering of large datasets
- **Data Downsampling**: LTTB, average, and max-min algorithms
- **Web Workers**: Offload heavy calculations to background threads
- **Memory Management**: Automatic memory optimization and cleanup

## Installation

```bash
# Install dependencies
npm install lightweight-charts lucide-react date-fns

# Or with yarn
yarn add lightweight-charts lucide-react date-fns
```

## Quick Start

```tsx
import { EnhancedChartContainer } from '@/components/chart'

function MyChart() {
  return (
    <EnhancedChartContainer
      data={candlestickData}
      tradeMarkers={tradeMarkers}
      height={600}
      theme="dark"
      performanceMode={true}
      onTradeClick={(trade) => console.log('Trade clicked:', trade)}
    />
  )
}
```

## Component API

### EnhancedChartContainer

The main chart component that provides all enhanced features.

```tsx
interface EnhancedChartContainerProps {
  data: CandlestickData[]           // Candlestick data
  tradeMarkers?: TradeMarker[]       // Trade position markers
  width?: number                     // Chart width (default: 800)
  height?: number                    // Chart height (default: 600)
  theme?: ChartTheme                 // Chart theme (default: light)
  onCrosshairMove?: (param: MouseEventParams) => void
  onTradeClick?: (tradeData: any) => void
  className?: string                 // Additional CSS classes
  showVolume?: boolean               // Show volume bars (default: false)
  showGrid?: boolean                 // Show grid lines (default: true)
  autoResize?: boolean               // Auto-resize on window resize (default: true)
  performanceMode?: boolean         // Enable performance optimizations (default: false)
}
```

### Technical Indicators

```tsx
import { useChartContext } from '@/components/chart'

function MyIndicators() {
  const { addIndicator, removeIndicator } = useChartContext()
  
  // Add SMA indicator
  addIndicator('sma', { period: 20, color: '#3b82f6' })
  
  // Add RSI indicator
  addIndicator('rsi', { period: 14, color: '#f59e0b' })
  
  // Remove indicator
  removeIndicator('sma_123456789')
}
```

### Drawing Tools

```tsx
import { DrawingManager, drawingTools } from '@/components/chart'

function MyDrawingTools() {
  const drawingManager = new DrawingManager()
  
  // Start drawing a trend line
  drawingManager.startDrawing('trendline', { x: 100, y: 200 })
  
  // Finish drawing
  const drawing = drawingManager.finishDrawing()
  
  // Export drawings
  const exported = drawingManager.exportDrawings()
}
```

## Data Formats

### Candlestick Data

```tsx
interface CandlestickData {
  time: number | string    // Unix timestamp or business day
  open: number            // Opening price
  high: number            // Highest price
  low: number             // Lowest price
  close: number           // Closing price
  volume?: number         // Trading volume (optional)
}
```

### Trade Markers

```tsx
interface TradeMarker {
  time: number | string    // Trade timestamp
  position: 'aboveBar' | 'belowBar' | 'inBar'
  shape: 'circle' | 'square' | 'triangleUp' | 'triangleDown' | 'arrowUp' | 'arrowDown'
  color: string           // Marker color
  text: string            // Marker text
  tradeData: any          // Associated trade data
}
```

## Performance Optimization

### Data Caching

```tsx
import { DataCache } from '@/components/chart'

const cache = new DataCache(100, 5 * 60 * 1000) // 100 items, 5 minute TTL

// Cache data
cache.set('key', data, 300000) // 5 minute TTL

// Get cached data
const cached = cache.get('key')

// Check if data exists
if (cache.has('key')) {
  // Use cached data
}
```

### Data Downsampling

```tsx
import { downsampleData } from '@/components/chart'

// Downsample 10,000 points to 1,000
const downsampled = downsampleData(largeData, 1000, 'lttb')

// Optimize for viewport
const optimized = optimizeDataForRendering(data, viewportWidth, 2000)
```

### Virtual Scrolling

```tsx
import { useVirtualScroll } from '@/components/chart'

function VirtualizedChart({ data }) {
  const {
    visibleData,
    containerProps,
    contentProps,
    itemProps,
  } = useVirtualScroll(data, 40, 600, 5)
  
  return (
    <div {...containerProps}>
      <div {...contentProps}>
        {visibleData.map((item, index) => (
          <div key={item.time} {...itemProps(index)}>
            {/* Render item */}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Accessibility

### Accessible Chart Container

```tsx
import { AccessibleChartContainer } from '@/components/chart'

function MyAccessibleChart() {
  return (
    <AccessibleChartContainer
      chartTitle="Bitcoin Price Chart"
      chartDescription="Interactive candlestick chart showing Bitcoin price movements"
      shortcutsHelp="Use arrow keys to navigate, +/- to zoom"
      dataSummary="Showing 1,000 data points from 2023-01-01 to 2023-12-31"
    >
      <EnhancedChartContainer data={data} />
    </AccessibleChartContainer>
  )
}
```

### Error Handling

```tsx
import { ChartErrorBoundary, ErrorPanel } from '@/components/chart'

function SafeChart() {
  return (
    <ChartErrorBoundary
      fallback={(error, errorInfo) => (
        <ErrorPanel
          error={error}
          title="Chart Error"
          description="Unable to load chart data"
          onRetry={() => window.location.reload()}
        />
      )}
    >
      <EnhancedChartContainer data={data} />
    </ChartErrorBoundary>
  )
}
```

## Keyboard Shortcuts

### Navigation
- `←/→`: Pan chart horizontally
- `↑/↓`: Pan chart vertically
- `+/-`: Zoom in/out
- `0`: Reset zoom

### Drawing Tools
- `T`: Select trend line tool
- `H`: Select horizontal line tool
- `V`: Select vertical line tool
- `R`: Select rectangle tool
- `C`: Select circle tool
- `F`: Select Fibonacci tool
- `Delete`: Delete selected drawing
- `Escape`: Cancel current tool

### Chart Features
- `Ctrl+V`: Toggle volume
- `Ctrl+G`: Toggle grid
- `Ctrl+I`: Toggle indicators
- `Ctrl+S`: Take screenshot
- `Ctrl+R`: Refresh chart
- `Ctrl+F`: Find/Go to date

### Time Frames
- `1`: 1 minute
- `5`: 5 minutes
- `6`: 15 minutes
- `4`: 1 hour
- `D`: Daily

## Styling and Themes

### Custom Theme

```tsx
import { chartThemes, ChartTheme } from '@/components/chart'

const customTheme: ChartTheme = {
  name: 'Custom',
  mode: 'dark',
  background: '#1a1a1a',
  textColor: '#e0e0e0',
  gridColor: '#333333',
  // ... other theme properties
}

// Register custom theme
chartThemes.custom = customTheme

// Use custom theme
<EnhancedChartContainer theme={customTheme} />
```

### CSS Customization

```css
/* Chart container styles */
.trading-view-widget {
  font-family: 'Inter', sans-serif;
}

/* Panel styles */
.chart-panel {
  background: var(--panel-background);
  border: 1px solid var(--panel-border);
}

/* Button styles */
.chart-button {
  @apply px-3 py-1.5 text-sm font-medium rounded-md transition-colors;
}
```

## Performance Monitoring

```tsx
import { usePerformanceMonitoring } from '@/components/chart'

function MonitoredChart() {
  const { metrics, measurePerformance } = usePerformanceMonitoring()
  
  const handleDataLoad = () => {
    const startTime = performance.now()
    // Load data...
    measurePerformance(startTime, data.length)
  }
  
  return (
    <div>
      {metrics.renderTime > 16 && (
        <div className="text-yellow-600">
          Slow render: {metrics.renderTime.toFixed(2)}ms
        </div>
      )}
      <EnhancedChartContainer data={data} />
    </div>
  )
}
```

## Browser Support

- **Chrome/Edge 90+**: Full feature support
- **Firefox 88+**: Full feature support
- **Safari 14+**: Full feature support
- **Mobile Browsers**: Touch-optimized interface

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Include accessibility attributes
4. Add performance optimizations for large datasets
5. Test across different browsers and devices

## License

MIT License - see LICENSE file for details.