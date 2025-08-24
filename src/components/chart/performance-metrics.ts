import type { TradeData as Trade } from '../../types/chart'

export interface PerformanceMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalProfit: number
  totalLoss: number
  netProfit: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  averageTrade: number
  maxWin: number
  maxLoss: number
  maxDrawdown: number
  maxDrawdownPeriod: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  recoveryFactor: number
  averageHoldingPeriod: number
  totalVolume: number
  averageVolume: number
  bestTrade: Trade | null
  worstTrade: Trade | null
  longestWinStreak: number
  longestLoseStreak: number
  currentStreak: number
  currentStreakType: 'win' | 'lose' | 'none'
}

export interface TradeStatistics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalProfit: number
  totalLoss: number
  netProfit: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  averageTrade: number
  maxWin: number
  maxLoss: number
  averageHoldingPeriod: number
  totalVolume: number
  averageVolume: number
}

export interface RiskMetrics {
  maxDrawdown: number
  maxDrawdownPeriod: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  recoveryFactor: number
  riskAdjustedReturn: number
  volatility: number
  downsideDeviation: number
  valueAtRisk: number
  expectedShortfall: number
}

export interface EquityCurve {
  time: string
  equity: number
  drawdown: number
  peak: number
}

export interface TradeDistribution {
  profitRanges: Array<{
    range: string
    count: number
    percentage: number
  }>
  durationRanges: Array<{
    range: string
    count: number
    percentage: number
  }>
  volumeRanges: Array<{
    range: string
    count: number
    percentage: number
  }>
}

export function calculateTradeStatistics(trades: Trade[]): TradeStatistics {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      averageTrade: 0,
      maxWin: 0,
      maxLoss: 0,
      averageHoldingPeriod: 0,
      totalVolume: 0,
      averageVolume: 0,
    }
  }

  const winningTrades = trades.filter(t => t.profit_pct > 0)
  const losingTrades = trades.filter(t => t.profit_pct < 0)
  
  const totalProfit = winningTrades.reduce((sum, t) => sum + Math.abs(t.profit_abs), 0)
  const totalLoss = losingTrades.reduce((sum, t) => sum + Math.abs(t.profit_abs), 0)
  const netProfit = totalProfit - totalLoss
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: (winningTrades.length / trades.length) * 100,
    totalProfit,
    totalLoss,
    netProfit,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
    averageWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
    averageTrade: netProfit / trades.length,
    maxWin: Math.max(...trades.map(t => t.profit_abs)),
    maxLoss: Math.min(...trades.map(t => t.profit_abs)),
    averageHoldingPeriod: trades.reduce((sum, t) => sum + t.trade_duration, 0) / trades.length,
    totalVolume: trades.reduce((sum, t) => sum + t.amount, 0),
    averageVolume: trades.reduce((sum, t) => sum + t.amount, 0) / trades.length,
  }
}

export function calculateRiskMetrics(trades: Trade[], initialCapital: number = 10000): RiskMetrics {
  if (trades.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPeriod: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      recoveryFactor: 0,
      riskAdjustedReturn: 0,
      volatility: 0,
      downsideDeviation: 0,
      valueAtRisk: 0,
      expectedShortfall: 0,
    }
  }

  const equityCurve = calculateEquityCurve(trades, initialCapital)
  const returns = calculateReturns(equityCurve)
  
  const maxDrawdown = calculateMaxDrawdown(equityCurve)
  const maxDrawdownPeriod = calculateMaxDrawdownPeriod(equityCurve)
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const volatility = calculateVolatility(returns)
  const downsideDeviation = calculateDownsideDeviation(returns, 0)
  
  const sharpeRatio = volatility > 0 ? meanReturn / volatility : 0
  const sortinoRatio = downsideDeviation > 0 ? meanReturn / downsideDeviation : 0
  const calmarRatio = maxDrawdown > 0 ? meanReturn / maxDrawdown : 0
  
  const recoveryFactor = maxDrawdown > 0 ? equityCurve[equityCurve.length - 1].equity / maxDrawdown : 0
  
  return {
    maxDrawdown,
    maxDrawdownPeriod,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    recoveryFactor,
    riskAdjustedReturn: sharpeRatio,
    volatility,
    downsideDeviation,
    valueAtRisk: calculateValueAtRisk(returns, 0.05),
    expectedShortfall: calculateExpectedShortfall(returns, 0.05),
  }
}

export function calculateEquityCurve(trades: Trade[], initialCapital: number): EquityCurve[] {
  const equityCurve: EquityCurve[] = []
  let currentEquity = initialCapital
  let peak = initialCapital
  
  trades.forEach(trade => {
    currentEquity += trade.profit_abs
    peak = Math.max(peak, currentEquity)
    
    equityCurve.push({
      time: trade.close_date,
      equity: currentEquity,
      drawdown: peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0,
      peak,
    })
  })
  
  return equityCurve
}

export function calculateTradeDistribution(trades: Trade[]): TradeDistribution {
  const profitRanges = [
    { range: '< -10%', min: -Infinity, max: -10 },
    { range: '-10% to -5%', min: -10, max: -5 },
    { range: '-5% to 0%', min: -5, max: 0 },
    { range: '0% to 5%', min: 0, max: 5 },
    { range: '5% to 10%', min: 5, max: 10 },
    { range: '> 10%', min: 10, max: Infinity },
  ]
  
  const durationRanges = [
    { range: '< 1h', min: 0, max: 3600 },
    { range: '1h - 4h', min: 3600, max: 14400 },
    { range: '4h - 24h', min: 14400, max: 86400 },
    { range: '1d - 3d', min: 86400, max: 259200 },
    { range: '> 3d', min: 259200, max: Infinity },
  ]
  
  const volumeRanges = [
    { range: '< 0.1', min: 0, max: 0.1 },
    { range: '0.1 - 0.5', min: 0.1, max: 0.5 },
    { range: '0.5 - 1.0', min: 0.5, max: 1.0 },
    { range: '1.0 - 2.0', min: 1.0, max: 2.0 },
    { range: '> 2.0', min: 2.0, max: Infinity },
  ]
  
  return {
    profitRanges: profitRanges.map(range => ({
      range: range.range,
      count: trades.filter(t => t.profit_pct >= range.min && t.profit_pct < range.max).length,
      percentage: (trades.filter(t => t.profit_pct >= range.min && t.profit_pct < range.max).length / trades.length) * 100,
    })),
    durationRanges: durationRanges.map(range => ({
      range: range.range,
      count: trades.filter(t => t.trade_duration >= range.min && t.trade_duration < range.max).length,
      percentage: (trades.filter(t => t.trade_duration >= range.min && t.trade_duration < range.max).length / trades.length) * 100,
    })),
    volumeRanges: volumeRanges.map(range => ({
      range: range.range,
      count: trades.filter(t => t.amount >= range.min && t.amount < range.max).length,
      percentage: (trades.filter(t => t.amount >= range.min && t.amount < range.max).length / trades.length) * 100,
    })),
  }
}

export function calculateStreaks(trades: Trade[]): {
  longestWinStreak: number
  longestLoseStreak: number
  currentStreak: number
  currentStreakType: 'win' | 'lose' | 'none'
} {
  let longestWinStreak = 0
  let longestLoseStreak = 0
  let currentWinStreak = 0
  let currentLoseStreak = 0
  
  trades.forEach(trade => {
    if (trade.profit_pct > 0) {
      currentWinStreak++
      currentLoseStreak = 0
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
    } else if (trade.profit_pct < 0) {
      currentLoseStreak++
      currentWinStreak = 0
      longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak)
    }
  })
  
  const lastTrade = trades[trades.length - 1]
  const currentStreakType = lastTrade ? 
    (lastTrade.profit_pct > 0 ? 'win' : lastTrade.profit_pct < 0 ? 'lose' : 'none') : 'none'
  const currentStreak = currentStreakType === 'win' ? currentWinStreak : 
    currentStreakType === 'lose' ? currentLoseStreak : 0
  
  return {
    longestWinStreak,
    longestLoseStreak,
    currentStreak,
    currentStreakType,
  }
}

export function calculateCompletePerformanceMetrics(trades: Trade[], initialCapital: number = 10000): PerformanceMetrics {
  const stats = calculateTradeStatistics(trades)
  const riskMetrics = calculateRiskMetrics(trades, initialCapital)
  const streaks = calculateStreaks(trades)
  
  const bestTrade = trades.reduce((best: Trade | null, trade: Trade) => 
    trade.profit_abs > (best?.profit_abs || -Infinity) ? trade : best, null
  )
  
  const worstTrade = trades.reduce((worst: Trade | null, trade: Trade) => 
    trade.profit_abs < (worst?.profit_abs || Infinity) ? trade : worst, null
  )
  
  return {
    ...stats,
    ...riskMetrics,
    bestTrade,
    worstTrade,
    ...streaks,
  }
}

// Helper functions
function calculateReturns(equityCurve: EquityCurve[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < equityCurve.length; i++) {
    const prevEquity = equityCurve[i - 1].equity
    const currentEquity = equityCurve[i].equity
    returns.push((currentEquity - prevEquity) / prevEquity)
  }
  return returns
}

function calculateMaxDrawdown(equityCurve: EquityCurve[]): number {
  let maxDrawdown = 0
  let peak = equityCurve[0]?.equity || 0
  
  equityCurve.forEach(point => {
    if (point.equity > peak) {
      peak = point.equity
    }
    const drawdown = ((peak - point.equity) / peak) * 100
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  })
  
  return maxDrawdown
}

function calculateMaxDrawdownPeriod(equityCurve: EquityCurve[]): number {
  let maxDrawdownPeriod = 0
  let currentDrawdownPeriod = 0
  let peak = equityCurve[0]?.equity || 0
  
  equityCurve.forEach(point => {
    if (point.equity > peak) {
      peak = point.equity
      currentDrawdownPeriod = 0
    } else {
      currentDrawdownPeriod++
      maxDrawdownPeriod = Math.max(maxDrawdownPeriod, currentDrawdownPeriod)
    }
  })
  
  return maxDrawdownPeriod
}

function calculateVolatility(returns: number[]): number {
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  return Math.sqrt(variance)
}

function calculateDownsideDeviation(returns: number[], threshold: number): number {
  const negativeReturns = returns.filter(r => r < threshold)
  if (negativeReturns.length === 0) return 0
  
  const mean = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length
  const variance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / negativeReturns.length
  return Math.sqrt(variance)
}

function calculateValueAtRisk(returns: number[], confidence: number): number {
  const sortedReturns = [...returns].sort((a, b) => a - b)
  const index = Math.floor((1 - confidence) * sortedReturns.length)
  return sortedReturns[index] || 0
}

function calculateExpectedShortfall(returns: number[], confidence: number): number {
  const sortedReturns = [...returns].sort((a, b) => a - b)
  const index = Math.floor((1 - confidence) * sortedReturns.length)
  const tailReturns = sortedReturns.slice(0, index)
  return tailReturns.length > 0 ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0
}