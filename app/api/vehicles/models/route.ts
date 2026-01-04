/**
 * Get Models from NHTSA
 * 
 * GET /api/vehicles/models?make=honda
 * GET /api/vehicles/models?make=honda&year=2015
 * GET /api/vehicles/models?make=honda&year=2015&type=truck
 */

import { NextResponse } from 'next/server'
import { getModelsForMake, getModelsForMakeYear } from '@/lib/api/nhtsa'
import { checkRateLimit, recordRateLimitAttempt } from '@/lib/risk/rateLimit'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const make = searchParams.get('make')
    const year = searchParams.get('year')
    const type = searchParams.get('type')

    if (!make) {
      return NextResponse.json({ error: 'Make parameter is required' }, { status: 400 })
    }

    // Rate limiting: Use user ID if authenticated, otherwise IP address
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const identifier = user?.id || ipAddress

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(identifier, 'api_models')
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
            'X-RateLimit-Limit': '200',
            'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
            'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
          },
        }
      )
    }

    let models
    if (year) {
      const modelyear = Number.parseInt(year, 10)
      if (Number.isNaN(modelyear)) {
        return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 })
      }
      models = await getModelsForMakeYear(make, modelyear, type || undefined)
    } else {
      models = await getModelsForMake(make)
    }

    // Record successful API call
    await recordRateLimitAttempt(identifier, 'api_models')

    return NextResponse.json(
      {
        success: true,
        data: models,
      },
      {
        headers: {
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Remaining': (rateLimitCheck.remaining - 1).toString(),
          'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
        },
      }
    )
  } catch (error: any) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch models' },
      { status: 500 }
    )
  }
}
