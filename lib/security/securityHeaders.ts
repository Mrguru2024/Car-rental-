/**
 * Security Headers Configuration
 * Implements security headers for API routes and middleware
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.opencagedata.com; frame-src https://js.stripe.com https://hooks.stripe.com;"
  )

  // X-Frame-Options: Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // X-Content-Type-Options: Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // X-XSS-Protection: Enable XSS filtering
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer-Policy: Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), payment=(self)'
  )

  // Strict-Transport-Security: Force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

/**
 * Middleware to add security headers
 */
export function securityHeadersMiddleware(request: NextRequest) {
  const response = NextResponse.next()
  return applySecurityHeaders(response)
}
