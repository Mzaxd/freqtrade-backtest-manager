import type { Time } from 'lightweight-charts'

export interface Point {
  x: number
  y: number
  time?: Time
  price?: number
}

export interface DrawingTool {
  id: string
  type: DrawingToolType
  points: Point[]
  color: string
  width: number
  style: 'solid' | 'dashed' | 'dotted'
  visible: boolean
  label?: string
  createdAt: Date
  updatedAt: Date
}

export type DrawingToolType = 
  | 'trendline'
  | 'horizontal'
  | 'vertical'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'arrow'
  | 'text'
  | 'fibonacci'
  | 'pitchfork'
  | 'gann'
  | 'measure'

export interface DrawingState {
  activeTool: DrawingToolType | null
  drawings: DrawingTool[]
  selectedDrawing: string | null
  isDrawing: boolean
  startPoint: Point | null
  endPoint: Point | null
  snapToPrice: boolean
  snapToTime: boolean
}

export interface DrawingToolConfig {
  type: DrawingToolType
  name: string
  icon: string
  color: string
  width: number
  style: 'solid' | 'dashed' | 'dotted'
  minPoints: number
  maxPoints: number
  description: string
}

export const drawingTools: DrawingToolConfig[] = [
  {
    type: 'trendline',
    name: 'Trend Line',
    icon: 'trending-up',
    color: '#3b82f6',
    width: 2,
    style: 'solid',
    minPoints: 2,
    maxPoints: 2,
    description: 'Draw trend lines to identify price direction'
  },
  {
    type: 'horizontal',
    name: 'Horizontal Line',
    icon: 'minus',
    color: '#10b981',
    width: 2,
    style: 'dashed',
    minPoints: 1,
    maxPoints: 1,
    description: 'Draw horizontal support/resistance lines'
  },
  {
    type: 'vertical',
    name: 'Vertical Line',
    icon: 'divide',
    color: '#f59e0b',
    width: 2,
    style: 'dashed',
    minPoints: 1,
    maxPoints: 1,
    description: 'Draw vertical time lines'
  },
  {
    type: 'rectangle',
    name: 'Rectangle',
    icon: 'square',
    color: '#8b5cf6',
    width: 2,
    style: 'solid',
    minPoints: 2,
    maxPoints: 2,
    description: 'Draw rectangles to highlight price ranges'
  },
  {
    type: 'circle',
    name: 'Circle',
    icon: 'circle',
    color: '#ef4444',
    width: 2,
    style: 'solid',
    minPoints: 2,
    maxPoints: 2,
    description: 'Draw circles to identify patterns'
  },
  {
    type: 'arrow',
    name: 'Arrow',
    icon: 'arrow-right',
    color: '#06b6d4',
    width: 2,
    style: 'solid',
    minPoints: 2,
    maxPoints: 2,
    description: 'Draw arrows to indicate direction'
  },
  {
    type: 'text',
    name: 'Text',
    icon: 'type',
    color: '#000000',
    width: 1,
    style: 'solid',
    minPoints: 1,
    maxPoints: 1,
    description: 'Add text annotations to the chart'
  },
  {
    type: 'fibonacci',
    name: 'Fibonacci',
    icon: 'activity',
    color: '#f97316',
    width: 2,
    style: 'solid',
    minPoints: 2,
    maxPoints: 2,
    description: 'Draw Fibonacci retracement levels'
  },
  {
    type: 'pitchfork',
    name: 'Pitchfork',
    icon: 'git-branch',
    color: '#a855f7',
    width: 2,
    style: 'solid',
    minPoints: 3,
    maxPoints: 3,
    description: 'Draw Andrews Pitchfork for trend analysis'
  },
]

// Fibonacci retracement levels
export const fibonacciLevels = [
  { level: 0, color: '#ef4444', label: '0%' },
  { level: 0.236, color: '#f59e0b', label: '23.6%' },
  { level: 0.382, color: '#eab308', label: '38.2%' },
  { level: 0.5, color: '#84cc16', label: '50%' },
  { level: 0.618, color: '#22c55e', label: '61.8%' },
  { level: 0.786, color: '#06b6d4', label: '78.6%' },
  { level: 1, color: '#3b82f6', label: '100%' },
]

// Drawing utility functions
export function createDrawingTool(
  type: DrawingToolType,
  points: Point[],
  config: DrawingToolConfig
): DrawingTool {
  return {
    id: `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    points: [...points],
    color: config.color,
    width: config.width,
    style: config.style,
    visible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

export function calculateMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }
}

export function calculateAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
}

export function calculateSlope(p1: Point, p2: Point): number {
  return (p2.y - p1.y) / (p2.x - p1.x)
}

export function snapToPoint(
  point: Point,
  dataPoints: Array<{ time: Time; price: number }>,
  tolerance: number = 10
): Point {
  if (!dataPoints.length) return point
  
  let closestPoint = point
  let minDistance = tolerance
  
  dataPoints.forEach(dataPoint => {
    const distance = Math.sqrt(
      Math.pow(point.x - (typeof dataPoint.time === 'number' ? dataPoint.time : 0), 2) + 
      Math.pow(point.y - (dataPoint.price || 0), 2)
    )
    
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = {
        x: typeof dataPoint.time === 'number' ? dataPoint.time : 0,
        y: dataPoint.price || 0,
        time: dataPoint.time,
        price: dataPoint.price,
      }
    }
  })
  
  return closestPoint
}

// Drawing validation
export function validateDrawingPoints(
  points: Point[],
  minPoints: number,
  maxPoints: number
): boolean {
  return points.length >= minPoints && points.length <= maxPoints
}

// Drawing serialization
export function serializeDrawing(drawing: DrawingTool): string {
  return JSON.stringify({
    ...drawing,
    createdAt: drawing.createdAt.toISOString(),
    updatedAt: drawing.updatedAt.toISOString(),
  })
}

export function deserializeDrawing(data: string): DrawingTool {
  const parsed = JSON.parse(data)
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
  }
}

// Drawing actions
export interface DrawingAction {
  type: 'create' | 'update' | 'delete' | 'select' | 'move'
  drawingId?: string
  drawing?: DrawingTool
  points?: Point[]
}

export class DrawingManager {
  private state: DrawingState
  private listeners: Array<(state: DrawingState) => void> = []

  constructor() {
    this.state = {
      activeTool: null,
      drawings: [],
      selectedDrawing: null,
      isDrawing: false,
      startPoint: null,
      endPoint: null,
      snapToPrice: true,
      snapToTime: true,
    }
  }

  getState(): DrawingState {
    return { ...this.state }
  }

  setState(newState: Partial<DrawingState>): void {
    this.state = { ...this.state, ...newState }
    this.notifyListeners()
  }

  subscribe(listener: (state: DrawingState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state))
  }

  startDrawing(toolType: DrawingToolType, startPoint: Point): void {
    this.setState({
      activeTool: toolType,
      isDrawing: true,
      startPoint,
      endPoint: startPoint,
    })
  }

  updateDrawing(endPoint: Point): void {
    if (this.state.isDrawing && this.state.startPoint) {
      this.setState({ endPoint })
    }
  }

  finishDrawing(): DrawingTool | null {
    if (!this.state.isDrawing || !this.state.startPoint || !this.state.endPoint) {
      return null
    }

    const config = drawingTools.find(t => t.type === this.state.activeTool)
    if (!config) return null

    const points = [this.state.startPoint, this.state.endPoint]
    if (!validateDrawingPoints(points, config.minPoints, config.maxPoints)) {
      return null
    }

    const drawing = createDrawingTool(this.state.activeTool!, points, config)
    this.setState({
      drawings: [...this.state.drawings, drawing],
      selectedDrawing: drawing.id,
      isDrawing: false,
      startPoint: null,
      endPoint: null,
    })

    return drawing
  }

  deleteDrawing(drawingId: string): void {
    this.setState({
      drawings: this.state.drawings.filter(d => d.id !== drawingId),
      selectedDrawing: this.state.selectedDrawing === drawingId ? null : this.state.selectedDrawing,
    })
  }

  selectDrawing(drawingId: string): void {
    this.setState({ selectedDrawing: drawingId })
  }

  updateDrawingPoints(drawingId: string, points: Point[]): void {
    this.setState({
      drawings: this.state.drawings.map(drawing =>
        drawing.id === drawingId
          ? { ...drawing, points, updatedAt: new Date() }
          : drawing
      ),
    })
  }

  clearAll(): void {
    this.setState({
      drawings: [],
      selectedDrawing: null,
      isDrawing: false,
      startPoint: null,
      endPoint: null,
    })
  }

  exportDrawings(): string {
    return JSON.stringify(this.state.drawings.map(serializeDrawing))
  }

  importDrawings(data: string): void {
    try {
      const drawings = JSON.parse(data).map(deserializeDrawing)
      this.setState({ drawings })
    } catch (error) {
      console.error('Failed to import drawings:', error)
    }
  }
}