import { NextRequest, NextResponse } from 'next/server'
import { SecurityMiddleware } from '@/lib/security'

/**
 * API authentication and security middleware
 * Provides basic authentication and rate limiting for API endpoints
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean
  response?: NextResponse
  error?: string
}> {
  try {
    // Get client IP for rate limiting
    const ip = 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      request.headers.get('cf-connecting-ip') || // Cloudflare
      'unknown'

    // Validate request using security middleware
    const securityValidation = await SecurityMiddleware.validateRequest({
      headers: Object.fromEntries(request.headers.entries()),
      ip
    })

    if (!securityValidation.isValid) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Security validation failed',
            details: securityValidation.errors
          },
          { status: 400 }
        )
      }
    }

    // For now, we'll use a simple API key authentication
    // In production, this should be replaced with proper JWT/OAuth
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.API_SECRET_KEY

    // Skip authentication for development (remove in production)
    if (process.env.NODE_ENV === 'development') {
      return { success: true }
    }

    // Check if API key is configured
    if (!apiKey) {
      console.warn('API_SECRET_KEY environment variable is not set')
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Server configuration error'
          },
          { status: 500 }
        )
      }
    }

    // Validate API key
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Missing or invalid authentication'
          },
          { status: 401 }
        )
      }
    }

    const token = authHeader.substring(7)
    if (token !== apiKey) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Invalid authentication token'
          },
          { status: 401 }
        )
      }
    }

    // If all checks pass, proceed
    return { success: true }

  } catch (error) {
    console.error('Authentication middleware error:', error)
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Helper function to create authenticated API route handlers
 */
export function withAuth<T extends object>(
  handler: (request: NextRequest, context: T) => Promise<NextResponse>
): (request: NextRequest, context: T) => Promise<NextResponse> {
  return async (request: NextRequest, context: T) => {
    const authResult = await authenticateRequest(request)
    
    if (!authResult.success) {
      return authResult.response!
    }
    
    return handler(request, context)
  }
}