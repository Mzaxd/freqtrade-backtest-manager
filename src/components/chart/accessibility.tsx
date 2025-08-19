import React, { ReactNode } from 'react'

export interface AccessibilityProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-busy'?: boolean
  'aria-expanded'?: boolean
  'aria-haspopup'?: boolean
  'aria-selected'?: boolean
  role?: string
  tabIndex?: number
}

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, errorInfo: React.ErrorInfo) => ReactNode)
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export interface LoadingStateProps {
  isLoading: boolean
  children: ReactNode
  fallback?: ReactNode
  skeleton?: ReactNode
  delay?: number
}

export interface ErrorMessageProps {
  error: Error | string
  title?: string
  description?: string
  onRetry?: () => void
  retryText?: string
  className?: string
}

export interface ChartAccessibilityProps {
  chartTitle: string
  chartDescription?: string
  landmark?: string
  shortcutsHelp?: string
  dataSummary?: string
}

// Error Boundary Component
export class ChartErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false, error: null as Error | null, errorInfo: null as React.ErrorInfo | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error!, this.state.errorInfo!)
        }
        return this.props.fallback
      }

      return (
        <ErrorPanel
          error={this.state.error || new Error('Unknown error')}
          title="Chart Error"
          description="An error occurred while rendering the chart."
          onRetry={() => window.location.reload()}
        />
      )
    }

    return this.props.children
  }
}

// Loading State Component
export function LoadingState({ 
  isLoading, 
  children, 
  fallback, 
  skeleton, 
  delay = 200 
}: LoadingStateProps) {
  const [showLoading, setShowLoading] = React.useState(false)

  React.useEffect(() => {
    let timer: NodeJS.Timeout
    if (isLoading) {
      timer = setTimeout(() => setShowLoading(true), delay)
    } else {
      setShowLoading(false)
    }
    return () => clearTimeout(timer)
  }, [isLoading, delay])

  if (!isLoading) return children
  if (!showLoading) return null

  if (skeleton) return skeleton
  if (fallback) return fallback

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Loading chart...</p>
      </div>
    </div>
  )
}

// Error Panel Component
export function ErrorPanel({
  error,
  title = "Error",
  description,
  onRetry,
  retryText = "Retry",
  className = "",
}: ErrorMessageProps) {
  const errorMessage = error instanceof Error ? error.message : error

  return (
    <div
      role="alert"
      className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          {description && (
            <p className="text-sm text-red-700 mt-1">{description}</p>
          )}
          <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {retryText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Accessible Chart Container
export function AccessibleChartContainer({
  children,
  chartTitle,
  chartDescription,
  landmark = 'region',
  shortcutsHelp,
  dataSummary,
}: {
  children: ReactNode
} & ChartAccessibilityProps) {
  const [showHelp, setShowHelp] = React.useState(false)

  return (
    <div
      role={landmark}
      aria-label={chartTitle}
      aria-describedby={chartDescription ? 'chart-description' : undefined}
      className="relative"
    >
      {/* Hidden descriptions for screen readers */}
      <div id="chart-description" className="sr-only">
        {chartDescription}
      </div>
      
      {dataSummary && (
        <div id="data-summary" className="sr-only">
          {dataSummary}
        </div>
      )}

      {/* Keyboard shortcuts help button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="absolute top-2 right-2 z-10 p-2 rounded bg-white shadow-sm border hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Keyboard shortcuts help"
        aria-expanded={showHelp}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Shortcuts help panel */}
      {showHelp && shortcutsHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          className="absolute top-12 right-2 z-20 w-80 bg-white rounded-lg shadow-lg border p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 id="shortcuts-title" className="text-sm font-medium">
              Keyboard Shortcuts
            </h3>
            <button
              onClick={() => setShowHelp(false)}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="Close shortcuts help"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {shortcutsHelp}
          </div>
        </div>
      )}

      {/* Chart content */}
      <div
        role="application"
        aria-label="Trading chart"
        tabIndex={0}
        className="outline-none"
      >
        {children}
      </div>
    </div>
  )
}

// Accessible Button Component
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  ariaLabel,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      {...props}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      className={`
        inline-flex items-center justify-center px-4 py-2 border border-transparent
        text-sm font-medium rounded-md shadow-sm text-white bg-blue-600
        hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2
        focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
        ${props.className || ''}
      `}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

// Accessible Form Controls
export function AccessibleSelect({
  label,
  options,
  value,
  onChange,
  id,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Screen Reader Announcements
export function useAnnouncements() {
  const [announcement, setAnnouncement] = React.useState('')

  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(''), 1000)
  }, [])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

// Focus Management
export function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref])
}

// Error Handling Utilities
export class ChartError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ChartError'
  }
}

export function handleChartError(error: unknown): ChartError {
  if (error instanceof ChartError) {
    return error
  }
  
  if (error instanceof Error) {
    return new ChartError(error.message, 'CHART_ERROR', error)
  }
  
  return new ChartError('An unknown error occurred', 'UNKNOWN_ERROR', error)
}

export function logError(error: Error, context?: any) {
  console.error('Chart Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })
}

// Performance Monitoring
export function usePerformanceMonitoring(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (duration > 100) { // Log slow renders
        console.warn(`Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`)
      }
    }
  }, [componentName])
}

// Accessibility Utilities
export function getAriaLabelForValue(value: number, type: 'price' | 'percentage' | 'volume'): string {
  switch (type) {
    case 'price':
      return `Price: ${value.toFixed(2)}`
    case 'percentage':
      return `${value.toFixed(2)} percent`
    case 'volume':
      return `Volume: ${value.toLocaleString()}`
    default:
      return value.toString()
  }
}

export function generateChartSummary(data: any[]): string {
  if (!data || data.length === 0) {
    return 'No data available for this chart.'
  }

  const firstPoint = data[0]
  const lastPoint = data[data.length - 1]
  const change = lastPoint.close - firstPoint.close
  const changePercent = (change / firstPoint.close) * 100

  return `Chart shows ${data.length} data points from ${new Date(firstPoint.time).toLocaleDateString()} to ${new Date(lastPoint.time).toLocaleDateString()}. 
  Starting price: ${firstPoint.close.toFixed(2)}, ending price: ${lastPoint.close.toFixed(2)}. 
  ${change >= 0 ? 'Increase' : 'Decrease'} of ${Math.abs(changePercent).toFixed(2)}%.`
}