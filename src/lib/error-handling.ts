/**
 * Comprehensive error handling utilities for the application
 * Provides standardized error types, handling patterns, and recovery mechanisms
 */

// ===== Error Types =====

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly type: string
  public readonly code: string
  public readonly statusCode: number
  public readonly context?: Record<string, unknown>
  public readonly timestamp: Date
  public readonly recoverable: boolean

  constructor(
    type: string,
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, unknown>,
    recoverable: boolean = false
  ) {
    super(message)
    this.name = this.constructor.name
    this.type = type
    this.code = code
    this.statusCode = statusCode
    this.context = context
    this.timestamp = new Date()
    this.recoverable = recoverable
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  toJSON() {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      stack: this.stack
    }
  }
}

// ===== Specific Error Types =====

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: unknown) {
    super(
      'VALIDATION_ERROR',
      message,
      'VALIDATION_FAILED',
      400,
      { field, value },
      true
    )
    this.name = 'ValidationError'
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(
      'AUTHENTICATION_ERROR',
      message,
      'AUTH_REQUIRED',
      401,
      undefined,
      false
    )
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(
      'AUTHORIZATION_ERROR',
      message,
      'INSUFFICIENT_PERMISSIONS',
      403,
      undefined,
      false
    )
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`
    super(
      'NOT_FOUND_ERROR',
      message,
      'RESOURCE_NOT_FOUND',
      404,
      { resource, id },
      false
    )
    this.name = 'NotFoundError'
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, table?: string) {
    super(
      'DATABASE_ERROR',
      message,
      'DATABASE_OPERATION_FAILED',
      500,
      { operation, table },
      true
    )
    this.name = 'DatabaseError'
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    statusCode: number = 502,
    endpoint?: string
  ) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      `Service ${service}: ${message}`,
      'EXTERNAL_SERVICE_FAILURE',
      statusCode,
      { service, endpoint },
      true
    )
    this.name = 'ExternalServiceError'
  }
}

/**
 * File system errors
 */
export class FileSystemError extends AppError {
  constructor(message: string, path?: string, operation?: string) {
    super(
      'FILE_SYSTEM_ERROR',
      message,
      'FILE_OPERATION_FAILED',
      500,
      { path, operation },
      true
    )
    this.name = 'FileSystemError'
  }
}

/**
 * Network errors
 */
export class NetworkError extends AppError {
  constructor(message: string, url?: string, method?: string) {
    super(
      'NETWORK_ERROR',
      message,
      'NETWORK_REQUEST_FAILED',
      503,
      { url, method },
      true
    )
    this.name = 'NetworkError'
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
  constructor(message: string, field?: string) {
    super(
      'CONFIGURATION_ERROR',
      message,
      'CONFIGURATION_INVALID',
      500,
      { field },
      false
    )
    this.name = 'ConfigurationError'
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, rule?: string, entity?: string) {
    super(
      'BUSINESS_LOGIC_ERROR',
      message,
      'BUSINESS_RULE_VIOLATION',
      422,
      { rule, entity },
      true
    )
    this.name = 'BusinessLogicError'
  }
}

// ===== Error Handling Utilities =====

/**
 * Error type guard
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Safe error parsing
 */
export function parseError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      'UNKNOWN_ERROR',
      error.message,
      'UNKNOWN_ERROR',
      500,
      { originalError: error.stack }
    )
  }

  if (typeof error === 'string') {
    return new AppError(
      'UNKNOWN_ERROR',
      error,
      'UNKNOWN_ERROR',
      500
    )
  }

  return new AppError(
    'UNKNOWN_ERROR',
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: error }
  )
}

/**
 * Async error wrapper with automatic error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: AppError) => void
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const appError = parseError(error)
    
    if (errorHandler) {
      errorHandler(appError)
    } else {
      console.error('Unhandled error:', appError.toJSON())
    }
    
    throw appError
  }
}

/**
 * Retry mechanism for recoverable errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delayMs?: number
    backoffFactor?: number
    retryableErrors?: string[]
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffFactor = 2,
    retryableErrors = ['NETWORK_ERROR', 'EXTERNAL_SERVICE_ERROR', 'DATABASE_ERROR']
  } = options

  let lastError: AppError

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = parseError(error)
      
      if (!retryableErrors.includes(lastError.type) || attempt === maxAttempts) {
        throw lastError
      }

      const delay = delayMs * Math.pow(backoffFactor, attempt - 1)
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, {
        error: lastError.message,
        type: lastError.type
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Circuit breaker pattern for external services
 */
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeoutMs: number = 30000,
    private readonly monitoringPeriodMs: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN'
      } else {
        throw new ExternalServiceError(
          'CircuitBreaker',
          'Service unavailable - circuit breaker open',
          503
        )
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    }
  }
}

// ===== Error Recovery Strategies =====

/**
 * Error recovery strategies
 */
export const RecoveryStrategies = {
  /**
   * Retry with exponential backoff
   */
  retry: withRetry,

  /**
   * Fallback to alternative data source
   */
  fallback: async function <T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    errorTypes: string[] = ['NETWORK_ERROR', 'EXTERNAL_SERVICE_ERROR']
  ): Promise<T> {
    try {
      return await primaryFn()
    } catch (error) {
      const appError = parseError(error)
      if (errorTypes.includes(appError.type)) {
        console.warn('Primary source failed, using fallback:', {
          error: appError.message,
          type: appError.type
        })
        return await fallbackFn()
      }
      throw appError
    }
  },

  /**
   * Graceful degradation
   */
  degrade: async function <T>(
    fn: () => Promise<T>,
    fallbackValue: T,
    errorTypes: string[] = ['EXTERNAL_SERVICE_ERROR', 'NETWORK_ERROR']
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      const appError = parseError(error)
      if (errorTypes.includes(appError.type)) {
        console.warn('Service degraded, using fallback value:', {
          error: appError.message,
          type: appError.type
        })
        return fallbackValue
      }
      throw appError
    }
  }
}

// ===== Error Monitoring and Reporting =====

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error monitoring interface
 */
export interface ErrorMonitor {
  report(error: AppError, severity: ErrorSeverity): void
  getErrors(): AppError[]
  clearErrors(): void
}

/**
 * In-memory error monitor
 */
export class MemoryErrorMonitor implements ErrorMonitor {
  private errors: AppError[] = []
  private readonly maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  report(error: AppError, severity: ErrorSeverity = ErrorSeverity.MEDIUM): void {
    const errorWithSeverity = new AppError(
      error.type,
      error.message,
      error.code,
      error.statusCode,
      error.context,
      error.recoverable
    )
    
    // Add severity as a custom property
    ;(errorWithSeverity as any).severity = severity

    this.errors.push(errorWithSeverity)

    if (this.errors.length > this.maxSize) {
      this.errors = this.errors.slice(-this.maxSize)
    }

    // Log critical errors immediately
    if (severity === ErrorSeverity.CRITICAL) {
      console.error('CRITICAL ERROR:', errorWithSeverity.toJSON())
    }
  }

  getErrors(): AppError[] {
    return [...this.errors]
  }

  clearErrors(): void {
    this.errors = []
  }

  getErrorsByType(type: string): AppError[] {
    return this.errors.filter(error => error.type === type)
  }

  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter(error => (error as any).severity === severity)
  }
}

// ===== Global Error Handler =====

/**
 * Global error handler for unhandled exceptions
 */
export function setupGlobalErrorHandler(monitor?: ErrorMonitor): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    const appError = parseError(error)
    console.error('Uncaught Exception:', appError.toJSON())
    
    if (monitor) {
      monitor.report(appError, ErrorSeverity.CRITICAL)
    }

    // Exit gracefully for critical errors
    if (appError.statusCode >= 500) {
      process.exit(1)
    }
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    const appError = parseError(reason)
    console.error('Unhandled Rejection:', appError.toJSON())
    
    if (monitor) {
      monitor.report(appError, ErrorSeverity.CRITICAL)
    }
  })
}

// ===== Export Utilities =====

/**
 * Create standardized error responses
 */
export const ErrorResponses = {
  validation: (message: string, field?: string) => ({
    success: false,
    error: {
      type: 'VALIDATION_ERROR' as const,
      message,
      field,
      code: 'VALIDATION_FAILED'
    },
    timestamp: new Date()
  }),

  notFound: (resource: string, id?: string) => ({
    success: false,
    error: {
      type: 'NOT_FOUND' as const,
      message: id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      code: 'RESOURCE_NOT_FOUND'
    },
    timestamp: new Date()
  }),

  unauthorized: (message: string = 'Authentication required') => ({
    success: false,
    error: {
      type: 'AUTHENTICATION_ERROR' as const,
      message,
      code: 'AUTH_REQUIRED'
    },
    timestamp: new Date()
  }),

  forbidden: (message: string = 'Insufficient permissions') => ({
    success: false,
    error: {
      type: 'AUTHORIZATION_ERROR' as const,
      message,
      code: 'INSUFFICIENT_PERMISSIONS'
    },
    timestamp: new Date()
  }),

  internal: (message: string = 'Internal server error') => ({
    success: false,
    error: {
      type: 'INTERNAL_ERROR' as const,
      message,
      code: 'INTERNAL_ERROR'
    },
    timestamp: new Date()
  }),

  external: (service: string, message: string) => ({
    success: false,
    error: {
      type: 'EXTERNAL_SERVICE_ERROR' as const,
      message: `Service ${service}: ${message}`,
      code: 'EXTERNAL_SERVICE_FAILURE'
    },
    timestamp: new Date()
  })
}

// Default error monitor instance
export const defaultErrorMonitor = new MemoryErrorMonitor()

// Setup global error handling by default
if (typeof process !== 'undefined') {
  setupGlobalErrorHandler(defaultErrorMonitor)
}