import type { Time } from 'lightweight-charts'

export interface IndicatorData {
  time: Time
  value: number
}

export interface TechnicalIndicator {
  id: string
  name: string
  type: 'overlay' | 'oscillator'
  data: IndicatorData[] | MACDData[] | BollingerBandsData[]
  color: string
  visible: boolean
  settings: any
}

export interface MovingAverageData extends IndicatorData {
  period: number
}

export interface RSIData extends IndicatorData {
  period: number
  overbought: number
  oversold: number
}

export interface MACDData {
  time: Time
  macd: number
  signal: number
  histogram: number
}

export interface BollingerBandsData {
  time: Time
  upper: number
  middle: number
  lower: number
}

// Moving Average calculation
export function calculateSMA(data: any[], period: number, priceKey: string = 'close'): MovingAverageData[] {
  const result: MovingAverageData[] = []
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, item) => acc + item[priceKey], 0)
    const sma = sum / period
    
    result.push({
      time: data[i].time,
      value: sma,
      period,
    })
  }
  
  return result
}

export function calculateEMA(data: any[], period: number, priceKey: string = 'close'): MovingAverageData[] {
  const result: MovingAverageData[] = []
  const multiplier = 2 / (period + 1)
  
  let ema = data[0][priceKey]
  result.push({
    time: data[0].time,
    value: ema,
    period,
  })
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i][priceKey] - ema) * multiplier + ema
    result.push({
      time: data[i].time,
      value: ema,
      period,
    })
  }
  
  return result
}

// RSI calculation
export function calculateRSI(data: any[], period: number = 14): RSIData[] {
  const result: RSIData[] = []
  const gains: number[] = []
  const losses: number[] = []
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
    
    const rs = avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))
    
    result.push({
      time: data[i + 1].time,
      value: rsi,
      period,
      overbought: 70,
      oversold: 30,
    })
  }
  
  return result
}

// MACD calculation
export function calculateMACD(
  data: any[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData[] {
  const result: MACDData[] = []
  
  const fastEMA = calculateEMA(data, fastPeriod, 'close')
  const slowEMA = calculateEMA(data, slowPeriod, 'close')
  
  const macdLine: number[] = []
  
  for (let i = 0; i < slowEMA.length; i++) {
    const macd = fastEMA[i + (slowPeriod - fastPeriod)].value - slowEMA[i].value
    macdLine.push(macd)
  }
  
  // Calculate signal line (EMA of MACD)
  const signalLine: number[] = []
  let signalEMA = macdLine[0]
  signalLine.push(signalEMA)
  
  const multiplier = 2 / (signalPeriod + 1)
  for (let i = 1; i < macdLine.length; i++) {
    signalEMA = (macdLine[i] - signalEMA) * multiplier + signalEMA
    signalLine.push(signalEMA)
  }
  
  // Calculate histogram
  for (let i = 0; i < macdLine.length; i++) {
    const histogram = macdLine[i] - signalLine[i]
    
    result.push({
      time: slowEMA[i].time,
      macd: macdLine[i],
      signal: signalLine[i],
      histogram,
    })
  }
  
  return result
}

// Bollinger Bands calculation
export function calculateBollingerBands(
  data: any[],
  period: number = 20,
  standardDeviations: number = 2
): BollingerBandsData[] {
  const result: BollingerBandsData[] = []
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1)
    const sum = slice.reduce((acc, item) => acc + item.close, 0)
    const middle = sum / period
    
    const variance = slice.reduce((acc, item) => acc + Math.pow(item.close - middle, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    const upper = middle + (standardDeviation * standardDeviations)
    const lower = middle - (standardDeviation * standardDeviations)
    
    result.push({
      time: data[i].time,
      upper,
      middle,
      lower,
    })
  }
  
  return result
}

// Volume Profile calculation
export interface VolumeProfileData {
  price: number
  volume: number
  buyVolume: number
  sellVolume: number
}

export function calculateVolumeProfile(
  data: any[],
  priceLevels: number = 50
): VolumeProfileData[] {
  const result: VolumeProfileData[] = []
  
  if (data.length === 0) return result
  
  const prices = data.map(d => d.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice
  const bucketSize = priceRange / priceLevels
  
  // Initialize buckets
  const buckets: VolumeProfileData[] = []
  for (let i = 0; i < priceLevels; i++) {
    const price = minPrice + (bucketSize * i)
    buckets.push({
      price,
      volume: 0,
      buyVolume: 0,
      sellVolume: 0,
    })
  }
  
  // Aggregate volume by price level
  data.forEach(candle => {
    const bucketIndex = Math.min(
      Math.floor((candle.close - minPrice) / bucketSize),
      priceLevels - 1
    )
    
    if (bucketIndex >= 0) {
      buckets[bucketIndex].volume += candle.volume || 0
      
      // Determine buy/sell volume based on candle color
      if (candle.close >= candle.open) {
        buckets[bucketIndex].buyVolume += candle.volume || 0
      } else {
        buckets[bucketIndex].sellVolume += candle.volume || 0
      }
    }
  })
  
  return buckets.filter(bucket => bucket.volume > 0)
}

// Support and Resistance levels
export interface SupportResistanceLevel {
  price: number
  strength: number
  type: 'support' | 'resistance'
}

export function findSupportResistance(
  data: any[],
  lookback: number = 20,
  tolerance: number = 0.02
): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = []
  
  for (let i = lookback; i < data.length - lookback; i++) {
    const current = data[i]
    
    // Check if current candle is a local high (resistance)
    let isHigh = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j].high > current.high) {
        isHigh = false
        break
      }
    }
    
    if (isHigh) {
      levels.push({
        price: current.high,
        strength: 1,
        type: 'resistance',
      })
    }
    
    // Check if current candle is a local low (support)
    let isLow = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j].low < current.low) {
        isLow = false
        break
      }
    }
    
    if (isLow) {
      levels.push({
        price: current.low,
        strength: 1,
        type: 'support',
      })
    }
  }
  
  // Merge nearby levels
  const mergedLevels: SupportResistanceLevel[] = []
  levels.forEach(level => {
    const existing = mergedLevels.find(l => 
      Math.abs(l.price - level.price) / level.price < tolerance &&
      l.type === level.type
    )
    
    if (existing) {
      existing.strength += 1
      existing.price = (existing.price + level.price) / 2
    } else {
      mergedLevels.push(level)
    }
  })
  
  return mergedLevels.sort((a, b) => b.strength - a.strength)
}