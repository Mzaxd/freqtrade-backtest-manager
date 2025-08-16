import { HyperoptTask as PrismaHyperoptTask, Strategy, Config } from '@prisma/client'

export interface HyperoptTask extends PrismaHyperoptTask {
  strategy: Strategy
  config: Config
  generatedBacktests?: Array<{
    id: string
    name: string
    status: string
    createdAt: Date
    completedAt?: Date
  }>
}

export interface CreateHyperoptTaskInput {
  name: string
  strategyId: number
  configId: number
  epochs: number
  spaces: string
  lossFunction: string
  timerange?: string
}

export interface HyperoptTaskStatus {
  PENDING: 'PENDING'
  RUNNING: 'RUNNING'
  COMPLETED: 'COMPLETED'
  FAILED: 'FAILED'
}

export interface HyperoptResult {
  loss: number
  params: Record<string, any>
  results: {
    total_trades: number
    win_rate: number
    profit_total: number
    profit_mean: number
    profit_median: number
    profit_std: number
    profit_min: number
    profit_max: number
    holding_avg: number
    holding_median: number
    holding_std: number
    holding_min: number
    holding_max: number
  }
}

export interface HyperoptEpoch {
  epoch: number
  loss: number
  params: Record<string, any>
  results: HyperoptResult['results']
  is_best: boolean
}

export const HYPEROPT_SPACES = {
  buy: 'buy',
  sell: 'sell',
  roi: 'roi',
  stoploss: 'stoploss',
  trailing: 'trailing',
  timeframe: 'timeframe',
} as const

export const HYPEROPT_LOSS_FUNCTIONS = {
  DefaultHyperOptLoss: 'DefaultHyperOptLoss',
  OnlyProfitHyperOptLoss: 'OnlyProfitHyperOptLoss',
  SharpeHyperOptLoss: 'SharpeHyperOptLoss',
  SharpeHyperOptLossDaily: 'SharpeHyperOptLossDaily',
  SortinoHyperOptLoss: 'SortinoHyperOptLoss',
  SortinoHyperOptLossDaily: 'SortinoHyperOptLossDaily',
  ProfitDrawdownHyperOptLoss: 'ProfitDrawdownHyperOptLoss',
  ProfitDrawdownHyperOptLossDaily: 'ProfitDrawdownHyperOptLossDaily',
} as const

export type HyperoptSpace = keyof typeof HYPEROPT_SPACES
export type HyperoptLossFunction = keyof typeof HYPEROPT_LOSS_FUNCTIONS