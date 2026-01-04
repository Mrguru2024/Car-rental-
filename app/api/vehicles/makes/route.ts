/**
 * Get All Makes from NHTSA
 * 
 * GET /api/vehicles/makes
 */

import { NextResponse } from 'next/server'
import { getAllMakes } from '@/lib/api/nhtsa'
import { checkRateLimit, recordRateLimitAttempt } from '@/lib/risk/rateLimit'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    // Rate limiting: Use user ID if authenticated, otherwise IP address
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const identifier = user?.id || ipAddress

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(identifier, 'api_makes')
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
            'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
          },
        }
      )
    }

    const makes = await getAllMakes()
    
    // Record successful API call
    await recordRateLimitAttempt(identifier, 'api_makes')

    return NextResponse.json(
      {
        success: true,
        data: makes,
      },
      {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': (rateLimitCheck.remaining - 1).toString(),
          'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching makes:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch makes' },
      { status: 500 }
    )
  }
}
