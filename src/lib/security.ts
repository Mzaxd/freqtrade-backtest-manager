/**
 * Security and input validation utilities
 * Provides comprehensive security measures for the application
 */

import { z } from 'zod'

// ===== Input Validation Schemas =====

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // String validations
  nonEmptyString: z.string().min(1, 'Value cannot be empty'),
  trimmedString: z.string().transform(val => val.trim()),
  sanitizedString: z.string().transform(val => 
    val
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove JavaScript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
  ),
  
  // Number validations
  positiveNumber: z.number().positive('Value must be positive'),
  nonNegativeNumber: z.number().nonnegative('Value cannot be negative'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  
  // Date validations
  isoDate: z.string().datetime('ISO datetime required'),
  futureDate: z.date().ref(val => val > new Date(), 'Date must be in the future'),
  pastDate: z.date().ref(val => val < new Date(), 'Date must be in the past'),
  
  // ID validations
  cuid: z.string().cuid(),
  uuid: z.string().uuid(),
  
  // Email validation
  email: z.string().email('Invalid email address'),
  
  // URL validation
  url: z.string().url('Invalid URL'),
  
  // Boolean validation
  booleanString: z.union([
    z.boolean(),
    z.string().transform(val => {
      if (typeof val === 'string') {
        const lowerVal = val.toLowerCase()
        if (lowerVal === 'true' || lowerVal === '1' || lowerVal === 'yes') return true
        if (lowerVal === 'false' || lowerVal === '0' || lowerVal === 'no') return false
      }
      return val
    }).pipe(z.boolean())
  ])
}

// ===== Trading-specific Validation Schemas =====

/**
 * Trading validation schemas
 */
export const TradingSchemas = {
  // Trading pair validation
  tradingPair: z.string()
    .regex(/^[A-Z0-9]+\/[A-Z0-9]+$/i, 'Invalid trading pair format (e.g., BTC/USDT)')
    .transform(val => val.toUpperCase()),
    
  // Timeframe validation
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d'], {
    errorMap: () => ({ message: 'Invalid timeframe' })
  }),
  
  // Exchange validation
  exchange: z.enum(['binance', 'coinbase', 'kraken', 'kucoin'], {
    errorMap: () => ({ message: 'Unsupported exchange' })
  }),
  
  // Market type validation
  marketType: z.enum(['spot', 'futures', 'margin'], {
    errorMap: () => ({ message: 'Invalid market type' })
  }),
  
  // Order type validation
  orderType: z.enum(['market', 'limit', 'stop_limit', 'stop_market'], {
    errorMap: () => ({ message: 'Invalid order type' })
  }),
  
  // Trade validation
  trade: z.object({
    pair: CommonSchemas.tradingPair,
    open_date: CommonSchemas.isoDate,
    close_date: CommonSchemas.isoDate,
    profit_abs: z.number(),
    profit_pct: z.number(),
    open_rate: CommonSchemas.positiveNumber,
    close_rate: CommonSchemas.positiveNumber,
    amount: CommonSchemas.positiveNumber,
    stake_amount: CommonSchemas.positiveNumber,
    trade_duration: z.number().int().nonnegative(),
    exit_reason: CommonSchemas.nonEmptyString
  }).ref(data => 
    new Date(data.close_date) > new Date(data.open_date),
    'Close date must be after open date'
  ),
  
  // Strategy validation
  strategy: z.object({
    name: CommonSchemas.nonEmptyString,
    className: CommonSchemas.nonEmptyString,
    description: z.string().optional(),
    parameters: z.record(z.any()).optional()
  }),
  
  // Configuration validation
  config: z.object({
    name: CommonSchemas.nonEmptyString,
    timeframe: TradingSchemas.timeframe,
    stakeAmount: CommonSchemas.positiveNumber,
    maxOpenTrades: z.number().int().positive().optional(),
    stopLoss: z.number().positive().optional(),
    takeProfit: z.number().positive().optional(),
    trailingStop: z.boolean().optional()
  })
}

// ===== File Path Validation =====

/**
 * File path security validation
 */
export class FilePathValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /\.\./, // Directory traversal
    /^\/|\\/, // Absolute paths
    /[<>:"|?*]/, // Invalid characters
    /^con$/i, // Reserved Windows names
    /^prn$/i,
    /^aux$/i,
    /^nul$/i,
    /^com[1-9]$/i,
    /^lpt[1-9]$/i
  ]

  private static readonly ALLOWED_EXTENSIONS = [
    '.json', '.js', '.ts', '.tsx', '.jsx', '.py',
    '.txt', '.log', '.csv', '.png', '.jpg', '.jpeg'
  ]

  static validate(filePath: string, options: {
    allowRelative?: boolean
    allowedExtensions?: string[]
    requireExtension?: boolean
  } = {}): { isValid: boolean; errors: string[] } {
    const {
      allowRelative = false,
      allowedExtensions = this.ALLOWED_EXTENSIONS,
      requireExtension = true
    } = options

    const errors: string[] = []

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(filePath)) {
        errors.push(`File path contains dangerous pattern: ${pattern}`)
      }
    }

    // Check if absolute path is allowed
    if (!allowRelative && (filePath.startsWith('/') || filePath.startsWith('\\'))) {
      errors.push('Absolute paths are not allowed')
    }

    // Check extension
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
    if (requireExtension && !extension) {
      errors.push('File extension is required')
    } else if (extension && !allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`)
    }

    // Check file length
    if (filePath.length > 255) {
      errors.push('File path is too long (max 255 characters)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  static sanitize(filePath: string): string {
    return filePath
      .replace(/[<>:"|?*]/g, '') // Remove invalid characters
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\\+/g, '/') // Normalize path separators
      .trim()
  }
}

// ===== Environment Variable Validation =====

/**
 * Environment variable validation
 */
export class EnvValidator {
  private static readonly REQUIRED_VARS = [
    'DATABASE_URL',
    'REDIS_URL',
    'FREQTRADE_PATH',
    'FREQTRADE_USER_DATA_PATH'
  ]

  private static readonly OPTIONAL_VARS = [
    'FREQTRADE_CONTAINER_USER_DATA_PATH',
    'NODE_ENV',
    'PORT'
  ]

  static validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required variables
    for (const varName of this.REQUIRED_VARS) {
      if (!process.env[varName]) {
        errors.push(`Required environment variable ${varName} is missing`)
      }
    }

    // Validate specific variable formats
    if (process.env.DATABASE_URL) {
      try {
        new URL(process.env.DATABASE_URL)
      } catch {
        errors.push('DATABASE_URL is not a valid URL')
      }
    }

    if (process.env.REDIS_URL) {
      try {
        new URL(process.env.REDIS_URL)
      } catch {
        errors.push('REDIS_URL is not a valid URL')
      }
    }

    if (process.env.PORT) {
      const port = parseInt(process.env.PORT)
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('PORT must be a valid number between 1 and 65535')
      }
    }

    // Check optional variables
    for (const varName of this.OPTIONAL_VARS) {
      if (!process.env[varName]) {
        warnings.push(`Optional environment variable ${varName} is missing`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static getValidatedEnv(): Record<string, string> {
    const env: Record<string, string> = {}
    
    for (const varName of [...this.REQUIRED_VARS, ...this.OPTIONAL_VARS]) {
      if (process.env[varName]) {
        env[varName] = process.env[varName]!
      }
    }
    
    return env
  }
}

// ===== SQL Injection Prevention =====

/**
 * SQL injection prevention utilities
 */
export class SQLInjectionPrevention {
  private static readonly DANGEROUS_KEYWORDS = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE',
    'UNION', 'JOIN', 'WHERE', 'SELECT', 'FROM', 'INTO',
    'EXEC', 'EXECUTE', 'sp_', 'xp_', '--', '/*', '*/',
    '1=1', '1=2', 'OR', 'AND', 'XOR', 'NOT', 'NULL'
  ]

  private static readonly DANGEROUS_PATTERNS = [
    /['"]/g, // Quotes
    /;/g, // Statement separators
    /\/\*|\*\//g, // Comments
    /--/g, // SQL comments
    /xp_/gi, // Extended stored procedures
    /sp_/gi, // Stored procedures
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi
  ]

  static sanitize(input: string): string {
    return input
      .replace(/['"]/g, '') // Remove quotes
      .replace(/;/g, '') // Remove statement separators
      .replace(/\/\*|\*\//g, '') // Remove comments
      .replace(/--/g, '') // Remove SQL comments
      .trim()
  }

  static detectSQLInjection(input: string): boolean {
    const upperInput = input.toUpperCase()
    
    // Check for dangerous keywords
    for (const keyword of this.DANGEROUS_KEYWORDS) {
      if (upperInput.includes(keyword)) {
        return true
      }
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        return true
      }
    }

    return false
  }

  static validateQuery(query: string): { isValid: boolean; sanitized: string; risks: string[] } {
    const risks: string[] = []

    if (this.detectSQLInjection(query)) {
      risks.push('Potential SQL injection detected')
    }

    const sanitized = this.sanitize(query)

    return {
      isValid: risks.length === 0,
      sanitized,
      risks
    }
  }
}

// ===== XSS Prevention =====

/**
 * Cross-site scripting prevention utilities
 */
export class XSSPrevention {
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi
  ]

  static sanitize(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  static detectXSS(input: string): boolean {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        return true
      }
    }
    return false
  }

  static validateHTML(input: string): { isValid: boolean; sanitized: string; risks: string[] } {
    const risks: string[] = []

    if (this.detectXSS(input)) {
      risks.push('Potential XSS attack detected')
    }

    const sanitized = this.sanitize(input)

    return {
      isValid: risks.length === 0,
      sanitized,
      risks
    }
  }
}

// ===== Request Validation =====

/**
 * HTTP request validation utilities
 */
export class RequestValidator {
  static validateHeaders(headers: Record<string, string>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-host',
      'x-forwarded-proto'
    ]

    for (const header of suspiciousHeaders) {
      if (headers[header] && typeof headers[header] === 'string') {
        const value = headers[header] as string
        if (value.includes(',') || value.includes('\n') || value.includes('\r')) {
          errors.push(`Suspicious ${header} header`)
        }
      }
    }

    // Validate content type
    if (headers['content-type']) {
      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ]

      const contentType = headers['content-type'].split(';')[0].trim()
      if (!allowedContentTypes.includes(contentType)) {
        errors.push(`Unsupported content type: ${contentType}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  static validateBody(body: unknown, schema: z.ZodType<any>): { 
    isValid: boolean; 
    sanitizedBody: any; 
    errors: string[] 
  } {
    const errors: string[] = []

    try {
      const validatedBody = schema.parse(body)
      return {
        isValid: true,
        sanitizedBody: validatedBody,
        errors
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`))
      } else {
        errors.push('Invalid request body')
      }

      return {
        isValid: false,
        sanitizedBody: null,
        errors
      }
    }
  }
}

// ===== Rate Limiting =====

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly windowMs: number
  private readonly maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests

    // Clean up old requests periodically
    setInterval(() => this.cleanup(), this.windowMs)
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    const userRequests = this.requests.get(key) || []

    // Remove old requests
    const validRequests = userRequests.filter(time => time > windowStart)

    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(key, validRequests)

    return true
  }

  getRemainingRequests(key: string): number {
    const now = Date.now()
    const windowStart = now - this.windowMs
    const userRequests = this.requests.get(key) || []
    const validRequests = userRequests.filter(time => time > windowStart)

    return Math.max(0, this.maxRequests - validRequests.length)
  }

  private cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.windowMs

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart)
      if (validRequests.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validRequests)
      }
    }
  }
}

// ===== Security Middleware =====

/**
 * Security middleware for Express/Next.js
 */
export class SecurityMiddleware {
  private static rateLimiter = new RateLimiter()

  static async validateRequest(request: {
    headers: Record<string, string>
    body?: unknown
    ip?: string
  }, schema?: z.ZodType<any>): Promise<{
    isValid: boolean
    errors: string[]
    sanitizedBody?: any
  }> {
    const errors: string[] = []

    // Validate headers
    const headerValidation = RequestValidator.validateHeaders(request.headers)
    errors.push(...headerValidation.errors)

    // Validate body if provided
    let sanitizedBody: any = undefined
    if (request.body && schema) {
      const bodyValidation = RequestValidator.validateBody(request.body, schema)
      errors.push(...bodyValidation.errors)
      sanitizedBody = bodyValidation.sanitizedBody
    }

    // Rate limiting
    if (request.ip) {
      if (!this.rateLimiter.isAllowed(request.ip)) {
        errors.push('Rate limit exceeded')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedBody
    }
  }

  static sanitizeResponse(data: unknown): unknown {
    if (typeof data === 'string') {
      return XSSPrevention.sanitize(data)
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item))
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeResponse(value)
      }
      return sanitized
    }

    return data
  }
}

// ===== Security Utilities =====

/**
 * Comprehensive security validation utilities
 */
export const SecurityUtils = {
  /**
   * Validate and sanitize all inputs
   */
  validateInput: (input: unknown, type: 'string' | 'number' | 'email' | 'url' | 'json') => {
    switch (type) {
      case 'string':
        return CommonSchemas.sanitizedString.parse(input)
      case 'number':
        return z.number().parse(input)
      case 'email':
        return CommonSchemas.email.parse(input)
      case 'url':
        return CommonSchemas.url.parse(input)
      case 'json':
        return z.record(z.any()).parse(input)
      default:
        throw new Error(`Unknown validation type: ${type}`)
    }
  },

  /**
   * Generate secure random token
   */
  generateSecureToken: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return result
  },

  /**
   * Hash password securely
   */
  hashPassword: async (password: string): Promise<string> => {
    // In a real implementation, use bcrypt or argon2
    // This is a placeholder for demonstration
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  },

  /**
   * Compare password with hash
   */
  comparePassword: async (password: string, hash: string): Promise<boolean> => {
    const hashedPassword = await SecurityUtils.hashPassword(password)
    return hashedPassword === hash
  }
}

// ===== Export All =====

export {
  CommonSchemas,
  TradingSchemas,
  FilePathValidator,
  EnvValidator,
  SQLInjectionPrevention,
  XSSPrevention,
  RequestValidator,
  RateLimiter,
  SecurityMiddleware,
  SecurityUtils
}