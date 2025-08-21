import React, { useState, useEffect, ReactNode } from 'react'

export interface ResponsiveLayoutProps {
  children: ReactNode
  className?: string
}

export interface ChartLayoutProps {
  chart: ReactNode
  toolbar: ReactNode
  sidebar?: ReactNode
  indicators?: ReactNode
  performance?: ReactNode
  className?: string
}

export interface ResponsiveBreakpoints {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

export const breakpoints: ResponsiveBreakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

export function useBreakpoint(): keyof ResponsiveBreakpoints {
  if (typeof window === 'undefined') return 'md'
  
  const width = window.innerWidth
  
  if (width >= breakpoints['2xl']) return '2xl'
  if (width >= breakpoints.xl) return 'xl'
  if (width >= breakpoints.lg) return 'lg'
  if (width >= breakpoints.md) return 'md'
  if (width >= breakpoints.sm) return 'sm'
  return 'xs'
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])
  
  return matches
}

export function ResponsiveContainer({ children, className = '' }: ResponsiveLayoutProps) {
  return (
    <div className={`relative w-full h-full min-h-0 ${className}`}>
      {children}
    </div>
  )
}

export function ChartLayout({
  chart,
  toolbar,
  sidebar,
  indicators,
  performance,
  className = '',
}: ChartLayoutProps) {
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm'
  const isTablet = breakpoint === 'md'
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl'
  
  if (isMobile) {
    return (
      <ResponsiveContainer className={className}>
        {/* Mobile Layout */}
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex-shrink-0 border-b">
            {toolbar}
          </div>
          
          {/* Main Chart Area */}
          <div className="flex-1 min-h-0">
            {chart}
          </div>
          
          {/* Bottom Sections */}
          <div className="flex-shrink-0 border-t">
            <div className="space-y-2 p-2">
              {indicators && (
                <div className="h-32 overflow-y-auto">
                  {indicators}
                </div>
              )}
              {performance && (
                <div className="h-32 overflow-y-auto">
                  {performance}
                </div>
              )}
            </div>
          </div>
          
          {/* Floating Sidebar (Drawer) */}
          {sidebar && (
            <div className="fixed inset-0 z-50 hidden">
              <div className="absolute inset-0 bg-black bg-opacity-50" />
              <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg">
                {sidebar}
              </div>
            </div>
          )}
        </div>
      </ResponsiveContainer>
    )
  }
  
  if (isTablet) {
    return (
      <ResponsiveContainer className={className}>
        {/* Tablet Layout */}
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex-shrink-0 border-b">
            {toolbar}
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex">
            {/* Chart and Indicators */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0">
                {chart}
              </div>
              {indicators && (
                <div className="h-40 border-t">
                  {indicators}
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            {sidebar && (
              <div className="w-80 border-l">
                {sidebar}
              </div>
            )}
          </div>
          
          {/* Performance Panel */}
          {performance && (
            <div className="h-48 border-t">
              {performance}
            </div>
          )}
        </div>
      </ResponsiveContainer>
    )
  }
  
  // Desktop Layout
  return (
    <ResponsiveContainer className={className}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex-shrink-0 border-b">
          {toolbar}
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex">
          {/* Left Sidebar */}
          {sidebar && (
            <div className="w-64 border-r">
              {sidebar}
            </div>
          )}
          
          {/* Center Content */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Main Chart */}
            <div className="flex-1 min-h-0">
              {chart}
            </div>
            
            {/* Indicators Panel */}
            {indicators && (
              <div className="h-48 border-t">
                {indicators}
              </div>
            )}
          </div>
          
          {/* Right Sidebar */}
          {performance && (
            <div className="w-80 border-l">
              {performance}
            </div>
          )}
        </div>
      </div>
    </ResponsiveContainer>
  )
}

export function ResponsiveGrid({ children, className = '' }: ResponsiveLayoutProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {children}
    </div>
  )
}

export function ResponsiveFlex({
  children,
  direction = 'row',
  wrap = true,
  justify = 'start',
  align = 'start',
  className = '',
}: {
  children: ReactNode
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  wrap?: boolean
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  className?: string
}) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse',
  }
  
  const justifyClasses = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  }
  
  const alignClasses = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
  }
  
  return (
    <div
      className={`
        flex
        ${directionClasses[direction]}
        ${wrap ? 'flex-wrap' : 'flex-nowrap'}
        ${justifyClasses[justify]}
        ${alignClasses[align]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function ResponsiveToolbar({ children, className = '' }: ResponsiveLayoutProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 p-2 ${className}`}>
      {children}
    </div>
  )
}

export function ResponsivePanel({
  children,
  title,
  collapsible = true,
  defaultCollapsed = false,
  className = '',
}: {
  children: ReactNode
  title?: ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  
  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div
          className={`flex items-center justify-between p-3 border-b cursor-pointer hover:bg-gray-50 ${
            collapsible ? '' : 'cursor-default'
          }`}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          <div className="font-medium">{title}</div>
          {collapsible && (
            <svg
              className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      )}
      {!collapsed && <div className="p-3">{children}</div>}
    </div>
  )
}

export function ResponsiveDrawer({
  children,
  isOpen,
  onClose,
  position = 'right',
  width = '320px',
  className = '',
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  position?: 'left' | 'right' | 'top' | 'bottom'
  width?: string
  className?: string
}) {
  const positionClasses = {
    left: 'left-0 top-0 h-full',
    right: 'right-0 top-0 h-full',
    top: 'top-0 left-0 w-full',
    bottom: 'bottom-0 left-0 w-full',
  }
  
  const sizeClasses = {
    left: `w-[${width}]`,
    right: `w-[${width}]`,
    top: 'h-auto max-h-96',
    bottom: 'h-auto max-h-96',
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={`
          absolute bg-white shadow-lg transform transition-transform
          ${positionClasses[position]}
          ${sizeClasses[position]}
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  )
}

export function ResponsiveModal({
  children,
  isOpen,
  onClose,
  title,
  size = 'md',
  className = '',
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={`
          relative bg-white rounded-lg shadow-xl w-full
          ${sizeClasses[size]}
          ${className}
        `}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// Hook for responsive utilities
export function useResponsive() {
  const breakpoint = useBreakpoint()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isPortrait = useMediaQuery('(orientation: portrait)')
  const isLandscape = useMediaQuery('(orientation: landscape)')
  
  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }
}