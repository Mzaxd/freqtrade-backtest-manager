/**
 * Zod schemas for API validation and type safety
 * These schemas provide runtime validation for all API endpoints
 */

import { z } from 'zod'
import { Time } from 'lightweight-charts'

// ===== Base Types =====

/**
 * Universal API response wrapper
 */
export const ApiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.boolean(),
  data: dataSchema,
  timestamp: z.date(),
  metadata: z.object({
    requestId: z.string().optional(),
    duration: z.number().optional(),
    version: z.string().default('1.0.0')
  }).optional()
})

/**
 * Error response schema
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', 'FORBIDDEN', 'INTERNAL_ERROR', 'EXTERNAL_ERROR']),
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
    field: z.string().optional()
  }),
  timestamp: z.date()
})

// ===== Chart Data API Schemas =====

/**
 * OHLCV data schema for candlestick charts
 */
export const OHLCVDataSchema = z.object({
  time: z.union([z.number(), z.string()]),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional().default(0)
})

/**
 * Raw Freqtrade candlestick data schema (array format)
 * [timestamp, open, high, low, close, volume]
 */
export const RawCandlestickDataSchema = z.array(z.union([z.number(), z.string()]))
  .length(6, 'Raw candlestick data array must have 6 elements: [timestamp, open, high, low, close, volume]')
  .transform(([timestamp, open, high, low, close, volume]) => ({
    time: timestamp,
    open: open,
    high: high,
    low: low,
    close: close,
    volume: volume || 0, // Ensure volume is a number
  }));

/**
 * Trade data schema
 */
export const TradeDataSchema = z.object({
  pair: z.string().min(1, 'Pair is required'),
  open_date: z.string().datetime('ISO datetime required'),
  close_date: z.string().datetime('ISO datetime required'),
  profit_abs: z.number(),
  profit_pct: z.number(),
  open_rate: z.number().positive('Open rate must be positive'),
  close_rate: z.number().positive('Close rate must be positive'),
  amount: z.number().positive('Amount must be positive'),
  stake_amount: z.number().positive('Stake amount must be positive'),
  trade_duration: z.number().int().nonnegative('Trade duration must be non-negative'),
  exit_reason: z.string().min(1, 'Exit reason is required'),
  id: z.string().optional(),
  strategy: z.string().optional(),
  isProfitable: z.boolean().optional()
})

/**
 * Trade marker schema for chart display
 */
export const TradeMarkerSchema = z.object({
  time: z.union([z.number(), z.string()]),
  position: z.enum(['aboveBar', 'belowBar', 'inBar']),
  shape: z.enum(['circle', 'square', 'triangleUp', 'triangleDown', 'arrowUp', 'arrowDown', 'cross', 'plus']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be in hex format'),
  text: z.string().max(10, 'Text must be 10 characters or less'),
  tradeData: TradeDataSchema.extend({
    type: z.enum(['open', 'close'])
  })
})

/**
 * Chart data query parameters
 */
export const ChartDataQuerySchema = z.object({
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d']).default('5m'),
  pair: z.string().min(1, 'Pair is required'),
  limit: z.number().int().positive().max(10000).optional(),
  offset: z.number().int().nonnegative().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional()
})

/**
 * Chart data response schema
 */
export const ChartDataResponseSchema = z.object({
  candles: z.array(OHLCVDataSchema),
  trades: z.array(TradeDataSchema),
  timeframe: z.string(),
  pair: z.string(),
  metadata: z.object({
    totalCandles: z.number().int().nonnegative(),
    totalTrades: z.number().int().nonnegative(),
    dateRange: z.object({
      start: z.date(),
      end: z.date()
    }),
    generatedAt: z.date().default(new Date())
  }).optional()
})

// ===== Backtest API Schemas =====

/**
 * Backtest task schema
 */
export const BacktestTaskSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Name is required'),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  timeframe: z.string().optional(),
  timerangeStart: z.date().optional(),
  timerangeEnd: z.date().optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  resultsSummary: z.any().optional(),
  rawOutputPath: z.string().optional(),
  plotProfitUrl: z.string().optional(),
  logs: z.string().optional(),
  strategyId: z.number().positive(),
  configId: z.number().positive().optional(),
  candleDataFile: z.string().optional(),
  dataDownloadJobId: z.string().optional()
})

/**
 * Backtest creation schema
 */
export const CreateBacktestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  strategyId: z.number().positive('Strategy ID must be positive'),
  configId: z.number().positive('Config ID must be positive'),
  timeframe: z.string().default('5m'),
  timerangeStart: z.date().optional(),
  timerangeEnd: z.date().optional(),
  description: z.string().optional()
})

/**
 * Backtest update schema
 */
export const UpdateBacktestSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  timeframe: z.string().optional(),
  timerangeStart: z.date().optional(),
  timerangeEnd: z.date().optional()
})

// ===== Strategy API Schemas =====

/**
 * Strategy schema
 */
export const StrategySchema = z.object({
  id: z.number().positive(),
  filename: z.string().min(1, 'Filename is required'),
  className: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

/**
 * Strategy creation schema
 */
export const CreateStrategySchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  className: z.string().min(1, 'Class name is required'),
  description: z.string().optional()
})

// ===== Config API Schemas =====

/**
 * Config schema
 */
export const ConfigSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  data: z.record(z.string(), z.any()), // Fix: z.record requires key and value type
  createdAt: z.date(),
  updatedAt: z.date(),
  filename: z.string().optional()
})

/**
 * Config creation schema
 */
export const CreateConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  data: z.record(z.string(), z.any()), // Fix: z.record requires key and value type
  filename: z.string().optional()
})

// ===== Worker API Schemas =====

/**
 * Worker job schema
 */
export const WorkerJobSchema = z.object({
  id: z.string(),
  type: z.enum(['backtest', 'dataDownload', 'plot']),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  progress: z.number().min(0).max(100).optional(),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
  result: z.any().optional(),
  metadata: z.record(z.string(), z.any()).optional() // Fix: z.record requires key and value type
})

/**
 * Worker job creation schema
 */
export const CreateWorkerJobSchema = z.object({
  type: z.enum(['backtest', 'dataDownload', 'plot']),
  payload: z.record(z.string(), z.any()), // Fix: z.record requires key and value type
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  scheduledAt: z.date().optional()
})

// ===== Data Download API Schemas =====

/**
 * Data download job schema
 */
export const DataDownloadJobSchema = z.object({
  id: z.string().cuid(),
  exchange: z.string().min(1, 'Exchange is required'),
  pairs: z.array(z.string().min(1, 'Pair is required')).min(1, 'At least one pair is required'),
  timeframes: z.array(z.string().min(1, 'Timeframe is required')).min(1, 'At least one timeframe is required'),
  marketType: z.enum(['spot', 'futures']).default('spot'),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  logs: z.string().optional(),
  format: z.enum(['json', 'feather', 'parquet']).default('json'),
  createdAt: z.date(),
  updatedAt: z.date(),
  timerangeStart: z.date().optional(),
  timerangeEnd: z.date().optional()
})

/**
 * Data download creation schema
 */
export const CreateDataDownloadSchema = z.object({
  exchange: z.string().min(1, 'Exchange is required'),
  pairs: z.array(z.string().min(1, 'Pair is required')).min(1, 'At least one pair is required'),
  timeframes: z.array(z.string().min(1, 'Timeframe is required')).min(1, 'At least one timeframe is required'),
  marketType: z.enum(['spot', 'futures']).default('spot'),
  format: z.enum(['json', 'feather', 'parquet']).default('json'),
  timerangeStart: z.date().optional(),
  timerangeEnd: z.date().optional()
})

// ===== Utility Types =====

/**
 * Type inference from schemas
 */
export type OHLCVData = z.infer<typeof OHLCVDataSchema>
export type TradeData = z.infer<typeof TradeDataSchema>
export type TradeMarker = z.infer<typeof TradeMarkerSchema>
export type ChartDataQuery = z.infer<typeof ChartDataQuerySchema>
export type ChartDataResponse = z.infer<typeof ChartDataResponseSchema>
export type BacktestTask = z.infer<typeof BacktestTaskSchema>
export type CreateBacktest = z.infer<typeof CreateBacktestSchema>
export type UpdateBacktest = z.infer<typeof UpdateBacktestSchema>
export type Strategy = z.infer<typeof StrategySchema>
export type CreateStrategy = z.infer<typeof CreateStrategySchema>
export type Config = z.infer<typeof ConfigSchema>
export type CreateConfig = z.infer<typeof CreateConfigSchema>
export type WorkerJob = z.infer<typeof WorkerJobSchema>
export type CreateWorkerJob = z.infer<typeof CreateWorkerJobSchema>
export type DataDownloadJob = z.infer<typeof DataDownloadJobSchema>
export type CreateDataDownload = z.infer<typeof CreateDataDownloadSchema>

/**
 * API error response type
 */
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

/**
 * Generic API success response type
 */
export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<T>>>

// ===== Validation Utilities =====

/**
 * Validate and parse request query parameters
 */
export function validateQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  try {
    return schema.parse(query)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
    }
    throw error
  }
}

/**
 * Validate request body
 */
export function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
    }
    throw error
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  type: ApiErrorResponse['error']['type'],
  message: string,
  code?: string,
  details?: unknown,
  field?: string
): ApiErrorResponse {
  return {
    success: false,
    error: {
      type,
      message,
      code,
      details,
      field
    },
    timestamp: new Date()
  }
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: ApiResponse<T>['metadata']
): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date(),
    metadata
  }
}

// ===== Security Validation =====

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove JavaScript protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate file path to prevent directory traversal
 */
export function validateFilePath(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/')
  return !normalizedPath.includes('..') && !normalizedPath.startsWith('/')
}

/**
 * Validate timeframe format
 */
export function validateTimeframe(timeframe: string): boolean {
  const timeframeRegex = /^\d+[mhdw]$/i
  return timeframeRegex.test(timeframe)
}

/**
 * Validate trading pair format
 */
export function validateTradingPair(pair: string): boolean {
  const pairRegex = /^[A-Z0-9]+\/[A-Z0-9]+$/i
  return pairRegex.test(pair) || /^[A-Z0-9]+$/i.test(pair)
}