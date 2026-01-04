/**
 * Vehicle Recalls API Endpoint
 * Returns recall badge, standing, and recall details for a vehicle
 * 
 * GET /api/vehicle/recalls?vehicleId=...
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRecallsByVehicle, decodeVINForRecalls } from '@/lib/nhtsa/recalls'
import { computeRecallBadge, computeVehicleStanding } from '@/lib/recalls/scoring'
import { checkRateLimit, recordRateLimitAttempt } from '@/lib/risk/rateLimit'

const CACHE_TTL_DAYS = 7 // Cache recalls for 7 days

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicleId parameter is required' },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Rate limiting: Use user ID if authenticated, otherwise IP address
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const identifier = user?.id || ipAddress

    // Check rate limit (fail open if rate limit check fails)
    let rateLimitCheck: { allowed: boolean; remaining: number; resetAt: Date } | null = null
    try {
      rateLimitCheck = await checkRateLimit(identifier, 'recall_lookup')
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
              'X-RateLimit-Limit': '30',
              'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
              'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
            },
          }
        )
      }
    } catch (rateLimitError) {
      // If rate limiting fails (e.g., table doesn't exist), log and continue
      console.warn('Rate limit check failed, proceeding without rate limit:', rateLimitError)
      rateLimitCheck = { allowed: true, remaining: 30, resetAt: new Date(Date.now() + 3600000) }
    }

    // Use admin client for database operations (bypasses RLS for cache writes)
    const adminSupabase = createAdminClient()

    // Check if this is a placeholder/seed vehicle
    const isPlaceholder = vehicleId.startsWith('placeholder-') || vehicleId.startsWith('seed-')
    let vehicle: any = null

    if (isPlaceholder) {
      // Handle placeholder/seed vehicles - load from seed data
      const { seedVehicles } = await import('@/lib/data/seed-vehicles')
      let seedIndex: number
      if (vehicleId.startsWith('seed-')) {
        seedIndex = Number.parseInt(vehicleId.replace('seed-', ''), 10) - 1
      } else {
        seedIndex = Number.parseInt(vehicleId.replace('placeholder-', ''), 10)
      }

      if (seedIndex >= 0 && seedIndex < seedVehicles.length) {
        const seedVehicle = seedVehicles[seedIndex]
        vehicle = {
          id: vehicleId,
          make: seedVehicle.make,
          model: seedVehicle.model,
          year: seedVehicle.year,
          vin: null,
          dealer_id: null,
          status: 'active',
          vehicle_photos: [],
        }
      } else {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }
    } else {
      // Load vehicle from database
      const { data: dbVehicle, error: vehicleError } = await adminSupabase
        .from('vehicles')
        .select('id, make, model, year, vin, dealer_id, status, vehicle_photos(id)')
        .eq('id', vehicleId)
        .single()

      if (vehicleError || !dbVehicle) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }

      vehicle = dbVehicle

      // Only return recalls for active vehicles
      if (vehicle.status !== 'active') {
        return NextResponse.json(
          { error: 'Vehicle is not active' },
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }
    }

    // Check cache (only for database vehicles, not placeholders)
    let cached: any = null
    if (!isPlaceholder) {
      const { data: cacheData } = await adminSupabase
        .from('vehicle_recall_cache')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .single()
      cached = cacheData
    }

    const now = new Date()
    const cacheValid = cached && new Date(cached.expires_at) > now

    if (cacheValid) {
      // Return cached data
      const { data: standing } = await adminSupabase
        .from('vehicle_standing')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .single()

      return NextResponse.json(
        {
          vehicleId,
          badge: {
            color: cached.badge_color,
            label: cached.badge_label,
            recallCount: cached.recall_count,
            severity: cached.severity_level,
          },
          standing: standing
            ? {
                score: standing.standing_score,
                grade: standing.standing_grade,
                reasons: standing.reasons || [],
              }
            : null,
          recalls: (cached.recall_payload as any)?.results || [],
          fetchedAt: cached.fetched_at,
          expiresAt: cached.expires_at,
          cached: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': rateLimitCheck ? (rateLimitCheck.remaining - 1).toString() : '29',
            'X-RateLimit-Reset': rateLimitCheck ? rateLimitCheck.resetAt.toISOString() : new Date(Date.now() + 3600000).toISOString(),
          },
        }
      )
    }

    // Cache expired or missing - fetch fresh data
    let make = vehicle.make
    let model = vehicle.model
    let year = vehicle.year

    // If VIN exists, decode it to confirm/update make/model/year
    if (vehicle.vin) {
      try {
        const vinData = await decodeVINForRecalls(vehicle.vin)
        if (vinData) {
          make = vinData.make
          model = vinData.model
          year = vinData.year
        }
      } catch (error) {
        console.warn('VIN decode failed, using vehicle data:', error)
        // Continue with vehicle data
      }
    }

    if (!make || !model || !year) {
      return NextResponse.json(
        { error: 'Vehicle missing required make, model, or year' },
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Fetch recalls from NHTSA
    let recalls: any[] = []
    try {
      const nhtsaRecalls = await getRecallsByVehicle(make, model, year)
      recalls = nhtsaRecalls
    } catch (error: any) {
      // If NHTSA API fails, return error but don't break the request
      console.error('NHTSA recalls API error:', error)
      if (error.message?.includes('rate limit')) {
        // If rate limited, return cached data if available (even if expired)
        if (cached) {
          const { data: standing } = await adminSupabase
            .from('vehicle_standing')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .single()

          return NextResponse.json(
            {
              vehicleId,
              badge: {
                color: cached.badge_color,
                label: cached.badge_label,
                recallCount: cached.recall_count,
                severity: cached.severity_level,
              },
              standing: standing
                ? {
                    score: standing.standing_score,
                    grade: standing.standing_grade,
                    reasons: standing.reasons || [],
                  }
                : null,
              recalls: (cached.recall_payload as any)?.results || [],
              fetchedAt: cached.fetched_at,
              expiresAt: cached.expires_at,
              cached: true,
              warning: 'Using cached data due to API rate limit',
            },
            {
              headers: {
                'X-RateLimit-Limit': '30',
                'X-RateLimit-Remaining': (rateLimitCheck.remaining - 1).toString(),
                'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
              },
            }
          )
        }
      }
      // For other errors, return empty recalls
      recalls = []
    }

    // Compute badge
    const badge = computeRecallBadge(recalls)

    // Get photo count and dealer verification status
    const photoCount = vehicle.vehicle_photos?.length || 0

    // Check dealer verification (if profiles table has verification_status)
    let dealerVerified = false
    if (vehicle.dealer_id) {
      const { data: dealer } = await adminSupabase
        .from('profiles')
        .select('verification_status')
        .eq('id', vehicle.dealer_id)
        .single()

      dealerVerified = dealer?.verification_status === 'approved'
    }

    // Compute standing
    const standing = computeVehicleStanding(recalls, photoCount, dealerVerified)

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS)

    // Upsert cache (only for database vehicles, not placeholders)
    if (!isPlaceholder) {
      await adminSupabase.from('vehicle_recall_cache').upsert({
        vehicle_id: vehicleId,
        vin: vehicle.vin || null,
        model_year: year,
        make,
        model,
        recall_count: recalls.length,
        severity_level: badge.severity,
        badge_label: badge.label,
        badge_color: badge.color,
        recall_payload: { results: recalls },
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })

      // Upsert standing
      await adminSupabase.from('vehicle_standing').upsert({
        vehicle_id: vehicleId,
        standing_grade: standing.grade,
        standing_score: standing.score,
        reasons: standing.reasons,
        computed_at: now.toISOString(),
      })
    }

    // Record successful API call (fail silently if rate limit recording fails)
    try {
      await recordRateLimitAttempt(identifier, 'recall_lookup')
    } catch (rateLimitError) {
      console.warn('Failed to record rate limit attempt:', rateLimitError)
    }

    return NextResponse.json(
      {
        vehicleId,
        badge: {
          color: badge.color,
          label: badge.label,
          recallCount: badge.recallCount,
          severity: badge.severity,
        },
        standing: {
          score: standing.score,
          grade: standing.grade,
          reasons: standing.reasons,
        },
        recalls: recalls.map((r) => ({
          campaignNumber: r.NHTSACampaignNumber,
          make: r.Make,
          model: r.Model,
          modelYear: r.ModelYear,
          manufacturer: r.Manufacturer,
          reportReceivedDate: r.ReportReceivedDate,
          component: r.Component,
          summary: r.Summary,
          consequence: r.Consequence,
          remedy: r.Remedy,
          notes: r.Notes,
        })),
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        cached: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': rateLimitCheck ? (rateLimitCheck.remaining - 1).toString() : '29',
          'X-RateLimit-Reset': rateLimitCheck ? rateLimitCheck.resetAt.toISOString() : new Date(Date.now() + 3600000).toISOString(),
        },
      }
    )
  } catch (error: any) {
    console.error('Error in /api/vehicle/recalls:', error)
    // Always return JSON, never HTML
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recalls' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
