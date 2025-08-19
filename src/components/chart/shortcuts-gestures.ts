export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  description: string
  action: () => void
  category: 'chart' | 'drawing' | 'navigation' | 'tools' | 'general'
}

export interface GestureEvent {
  type: 'pan' | 'zoom' | 'pinch' | 'tap' | 'doubleTap' | 'longPress'
  x: number
  y: number
  deltaX?: number
  deltaY?: number
  scale?: number
  timestamp: number
}

export interface TouchPoint {
  x: number
  y: number
  id: number
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private enabled: boolean = true

  constructor() {
    this.setupGlobalShortcuts()
    this.setupEventListeners()
  }

  private setupGlobalShortcuts(): void {
    const globalShortcuts: KeyboardShortcut[] = [
      // Chart navigation
      {
        key: 'ArrowLeft',
        description: 'Pan chart left',
        action: () => this.panChart(-50, 0),
        category: 'navigation',
      },
      {
        key: 'ArrowRight',
        description: 'Pan chart right',
        action: () => this.panChart(50, 0),
        category: 'navigation',
      },
      {
        key: 'ArrowUp',
        description: 'Pan chart up',
        action: () => this.panChart(0, 50),
        category: 'navigation',
      },
      {
        key: 'ArrowDown',
        description: 'Pan chart down',
        action: () => this.panChart(0, -50),
        category: 'navigation',
      },
      {
        key: '+',
        description: 'Zoom in',
        action: () => this.zoomChart(1.2),
        category: 'navigation',
      },
      {
        key: '-',
        description: 'Zoom out',
        action: () => this.zoomChart(0.8),
        category: 'navigation',
      },
      {
        key: '0',
        description: 'Reset zoom',
        action: () => this.resetZoom(),
        category: 'navigation',
      },
      
      // Drawing tools
      {
        key: 't',
        description: 'Select trend line tool',
        action: () => this.selectDrawingTool('trendline'),
        category: 'drawing',
      },
      {
        key: 'h',
        description: 'Select horizontal line tool',
        action: () => this.selectDrawingTool('horizontal'),
        category: 'drawing',
      },
      {
        key: 'v',
        description: 'Select vertical line tool',
        action: () => this.selectDrawingTool('vertical'),
        category: 'drawing',
      },
      {
        key: 'r',
        description: 'Select rectangle tool',
        action: () => this.selectDrawingTool('rectangle'),
        category: 'drawing',
      },
      {
        key: 'c',
        description: 'Select circle tool',
        action: () => this.selectDrawingTool('circle'),
        category: 'drawing',
      },
      {
        key: 'f',
        description: 'Select Fibonacci tool',
        action: () => this.selectDrawingTool('fibonacci'),
        category: 'drawing',
      },
      {
        key: 'Delete',
        description: 'Delete selected drawing',
        action: () => this.deleteSelectedDrawing(),
        category: 'drawing',
      },
      {
        key: 'Escape',
        description: 'Cancel current tool',
        action: () => this.cancelCurrentTool(),
        category: 'drawing',
      },
      
      // Time frame shortcuts
      {
        key: '1',
        description: '1 minute timeframe',
        action: () => this.changeTimeframe('1m'),
        category: 'chart',
      },
      {
        key: '5',
        description: '5 minute timeframe',
        action: () => this.changeTimeframe('5m'),
        category: 'chart',
      },
      {
        key: '6',
        description: '15 minute timeframe',
        action: () => this.changeTimeframe('15m'),
        category: 'chart',
      },
      {
        key: '4',
        description: '1 hour timeframe',
        action: () => this.changeTimeframe('1h'),
        category: 'chart',
      },
      {
        key: 'd',
        description: 'Daily timeframe',
        action: () => this.changeTimeframe('1d'),
        category: 'chart',
      },
      
      // Chart features
      {
        key: 'v',
        ctrl: true,
        description: 'Toggle volume',
        action: () => this.toggleVolume(),
        category: 'chart',
      },
      {
        key: 'g',
        ctrl: true,
        description: 'Toggle grid',
        action: () => this.toggleGrid(),
        category: 'chart',
      },
      {
        key: 'i',
        ctrl: true,
        description: 'Toggle indicators',
        action: () => this.toggleIndicators(),
        category: 'chart',
      },
      {
        key: 's',
        ctrl: true,
        description: 'Take screenshot',
        action: () => this.takeScreenshot(),
        category: 'tools',
      },
      {
        key: 'r',
        ctrl: true,
        description: 'Refresh chart',
        action: () => this.refreshChart(),
        category: 'general',
      },
      {
        key: 'f',
        ctrl: true,
        description: 'Find/Go to date',
        action: () => this.openFindDialog(),
        category: 'general',
      },
    ]

    globalShortcuts.forEach(shortcut => {
      this.registerShortcut(shortcut)
    })
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('keyup', this.handleKeyUp.bind(this))
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return

    const shortcut = this.findShortcut(event)
    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      shortcut.action()
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key up events if needed
  }

  private findShortcut(event: KeyboardEvent): KeyboardShortcut | undefined {
    const key = event.key
    const ctrl = event.ctrlKey || event.metaKey
    const alt = event.altKey
    const shift = event.shiftKey
    const meta = event.metaKey

    const shortcutKey = this.generateShortcutKey(key, ctrl, alt, shift, meta)
    return this.shortcuts.get(shortcutKey)
  }

  private generateShortcutKey(
    key: string,
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
    meta: boolean
  ): string {
    const modifiers = []
    if (ctrl) modifiers.push('ctrl')
    if (alt) modifiers.push('alt')
    if (shift) modifiers.push('shift')
    if (meta) modifiers.push('meta')
    
    return [...modifiers, key.toLowerCase()].join('+')
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.generateShortcutKey(
      shortcut.key,
      shortcut.ctrl || false,
      shortcut.alt || false,
      shortcut.shift || false,
      shortcut.meta || false
    )
    this.shortcuts.set(key, shortcut)
  }

  unregisterShortcut(key: string, ctrl?: boolean, alt?: boolean, shift?: boolean, meta?: boolean): void {
    const shortcutKey = this.generateShortcutKey(key, ctrl || false, alt || false, shift || false, meta || false)
    this.shortcuts.delete(shortcutKey)
  }

  enable(): void {
    this.enabled = true
  }

  disable(): void {
    this.enabled = false
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category)
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
  }

  // Action methods (to be implemented by the chart component)
  private panChart(deltaX: number, deltaY: number): void {
    // This will be overridden by the chart component
    console.log('Pan chart:', { deltaX, deltaY })
  }

  private zoomChart(factor: number): void {
    console.log('Zoom chart:', { factor })
  }

  private resetZoom(): void {
    console.log('Reset zoom')
  }

  private selectDrawingTool(tool: string): void {
    console.log('Select drawing tool:', tool)
  }

  private deleteSelectedDrawing(): void {
    console.log('Delete selected drawing')
  }

  private cancelCurrentTool(): void {
    console.log('Cancel current tool')
  }

  private changeTimeframe(timeframe: string): void {
    console.log('Change timeframe:', timeframe)
  }

  private toggleVolume(): void {
    console.log('Toggle volume')
  }

  private toggleGrid(): void {
    console.log('Toggle grid')
  }

  private toggleIndicators(): void {
    console.log('Toggle indicators')
  }

  private takeScreenshot(): void {
    console.log('Take screenshot')
  }

  private refreshChart(): void {
    console.log('Refresh chart')
  }

  private openFindDialog(): void {
    console.log('Open find dialog')
  }
}

export class GestureManager {
  private element: HTMLElement
  private callbacks: Map<string, (event: GestureEvent) => void> = new Map()
  private touchPoints: Map<number, TouchPoint> = new Map()
  private lastTouchTime: number = 0
  private longPressTimer: NodeJS.Timeout | null = null
  private isPanning: boolean = false
  private lastPanPoint: { x: number; y: number } | null = null

  constructor(element: HTMLElement) {
    this.element = element
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Mouse events
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this))
    this.element.addEventListener('wheel', this.handleWheel.bind(this))

    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this))

    // Prevent default touch behaviors
    this.element.addEventListener('touchstart', (e) => e.preventDefault())
    this.element.addEventListener('touchmove', (e) => e.preventDefault())
  }

  private handleMouseDown(event: MouseEvent): void {
    const touchPoint: TouchPoint = {
      x: event.clientX,
      y: event.clientY,
      id: 0,
    }

    this.touchPoints.set(0, touchPoint)
    this.startLongPressTimer(touchPoint)
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.touchPoints.size === 1) {
      const touchPoint = this.touchPoints.get(0)!
      const deltaX = event.clientX - touchPoint.x
      const deltaY = event.clientY - touchPoint.y

      if (this.isPanning || Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        this.clearLongPressTimer()
        this.isPanning = true
        this.emitGesture('pan', {
          type: 'pan',
          x: event.clientX,
          y: event.clientY,
          deltaX,
          deltaY,
          timestamp: Date.now(),
        })
      }
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isPanning) {
      this.emitGesture('tap', {
        type: 'tap',
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now(),
      })
    }

    this.clearLongPressTimer()
    this.touchPoints.clear()
    this.isPanning = false
    this.lastPanPoint = null
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault()
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    this.emitGesture('zoom', {
      type: 'zoom',
      x: event.clientX,
      y: event.clientY,
      scale: delta,
      timestamp: Date.now(),
    })
  }

  private handleTouchStart(event: TouchEvent): void {
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i]
      const touchPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
      }
      this.touchPoints.set(touch.identifier, touchPoint)
    }

    if (this.touchPoints.size === 1) {
      this.startLongPressTimer(this.touchPoints.values().next().value)
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (this.touchPoints.size === 1) {
      const touch = event.touches[0]
      const touchPoint = this.touchPoints.get(touch.identifier)!
      const deltaX = touch.clientX - touchPoint.x
      const deltaY = touch.clientY - touchPoint.y

      if (this.isPanning || Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        this.clearLongPressTimer()
        this.isPanning = true
        this.emitGesture('pan', {
          type: 'pan',
          x: touch.clientX,
          y: touch.clientY,
          deltaX,
          deltaY,
          timestamp: Date.now(),
        })
      }
    } else if (this.touchPoints.size === 2) {
      this.clearLongPressTimer()
      this.handlePinchGesture(event)
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    const remainingTouches = new Set()
    for (let i = 0; i < event.touches.length; i++) {
      remainingTouches.add(event.touches[i].identifier)
    }

    const removedTouches = Array.from(this.touchPoints.keys()).filter(id => !remainingTouches.has(id))
    
    if (removedTouches.length > 0) {
      if (!this.isPanning && this.touchPoints.size === 1) {
        const touchPoint = this.touchPoints.get(removedTouches[0])!
        this.emitGesture('tap', {
          type: 'tap',
          x: touchPoint.x,
          y: touchPoint.y,
          timestamp: Date.now(),
        })
      }
    }

    removedTouches.forEach(id => this.touchPoints.delete(id))

    if (this.touchPoints.size === 0) {
      this.clearLongPressTimer()
      this.isPanning = false
      this.lastPanPoint = null
    }
  }

  private handleTouchCancel(event: TouchEvent): void {
    this.clearLongPressTimer()
    this.touchPoints.clear()
    this.isPanning = false
    this.lastPanPoint = null
  }

  private handlePinchGesture(event: TouchEvent): void {
    const touches = Array.from(event.touches)
    if (touches.length < 2) return

    const touch1 = touches[0]
    const touch2 = touches[1]
    
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )

    if (this.lastPanPoint) {
      const scale = distance / Math.sqrt(
        Math.pow(this.lastPanPoint.x, 2) +
        Math.pow(this.lastPanPoint.y, 2)
      )
      
      this.emitGesture('pinch', {
        type: 'pinch',
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
        scale,
        timestamp: Date.now(),
      })
    }

    this.lastPanPoint = {
      x: touch2.clientX - touch1.clientX,
      y: touch2.clientY - touch1.clientY,
    }
  }

  private startLongPressTimer(touchPoint: TouchPoint): void {
    this.clearLongPressTimer()
    this.longPressTimer = setTimeout(() => {
      this.emitGesture('longPress', {
        type: 'longPress',
        x: touchPoint.x,
        y: touchPoint.y,
        timestamp: Date.now(),
      })
    }, 500)
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  private emitGesture(type: string, event: GestureEvent): void {
    const callback = this.callbacks.get(type)
    if (callback) {
      callback(event)
    }
  }

  on(type: string, callback: (event: GestureEvent) => void): void {
    this.callbacks.set(type, callback)
  }

  off(type: string): void {
    this.callbacks.delete(type)
  }

  destroy(): void {
    this.clearLongPressTimer()
    this.callbacks.clear()
    this.touchPoints.clear()
  }
}

// Utility functions for gesture handling
export function getTouchCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length === 0) return { x: 0, y: 0 }
  
  let sumX = 0
  let sumY = 0
  
  for (let i = 0; i < touches.length; i++) {
    sumX += touches[i].clientX
    sumY += touches[i].clientY
  }
  
  return {
    x: sumX / touches.length,
    y: sumY / touches.length,
  }
}

export function getTouchDistance(touch1: Touch, touch2: Touch): number {
  return Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
    Math.pow(touch2.clientY - touch1.clientY, 2)
  )
}

export function isDoubleTap(lastTap: { x: number; y: number; time: number }, currentTap: { x: number; y: number; time: number }): boolean {
  const timeDiff = currentTap.time - lastTap.time
  const distance = Math.sqrt(
    Math.pow(currentTap.x - lastTap.x, 2) +
    Math.pow(currentTap.y - lastTap.y, 2)
  )
  
  return timeDiff < 300 && distance < 30
}