/**
 * VIN Lookup API Endpoint
 * Uses NHTSA for VIN decoding (primary) and Auto.dev for photos
 * 
 * GET /api/vehicles/vin-lookup?vin=WP0AF2A99KS165242&modelyear=2011
 */

import { NextResponse } from 'next/server'
import { decodeVINExtended, normalizeNHTSAData } from '@/lib/api/nhtsa'
import { getVINPhotos, isValidVIN } from '@/lib/api/autodev'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vin = searchParams.get('vin')
    const modelyear = searchParams.get('modelyear')

    if (!vin) {
      return NextResponse.json({ error: 'VIN parameter is required' }, { status: 400 })
    }

    // Validate VIN format
    if (!isValidVIN(vin)) {
      return NextResponse.json({ error: 'Invalid VIN format' }, { status: 400 })
    }

    // Decode VIN using NHTSA (primary source)
    const decoded = await decodeVINExtended(vin, modelyear ? Number.parseInt(modelyear, 10) : undefined)

    if (!decoded || !decoded['Make'] || !decoded['Model']) {
      return NextResponse.json({ error: 'Vehicle not found for this VIN' }, { status: 404 })
    }

    // Normalize NHTSA data to common format
    const normalizedData = normalizeNHTSAData(decoded, vin)

    // Fetch photos from Auto.dev (with rate limiting)
    let photos: string[] = []
    try {
      // Check rate limit for Auto.dev photos
      const photosRateLimitCheck = await checkRateLimit(identifier, 'autodev_photos')
      if (photosRateLimitCheck.allowed) {
        try {
          const autoDevPhotos = await getVINPhotos(vin)
          photos = autoDevPhotos.map((photo) => photo.url)
          // Record Auto.dev API call
          await recordRateLimitAttempt(identifier, 'autodev_photos')
        } catch (error: any) {
          // Handle Auto.dev rate limiting - don't fail the whole request
          if (error.message?.includes('rate limit')) {
            console.warn('Auto.dev API rate limit exceeded, skipping photo fetch')
          } else {
            console.warn('Auto.dev photos not available:', error)
          }
        }
      } else {
        console.warn('Auto.dev photos rate limit exceeded, skipping photo fetch')
      }
    } catch (error) {
      // Auto.dev photos are optional, continue without them
      console.warn('Auto.dev photos error:', error)
    }

    // Record successful VIN lookup
    await recordRateLimitAttempt(identifier, 'vin_lookup')

    return NextResponse.json(
      {
        success: true,
        data: {
          vin: normalizedData.vin || vin,
          year: normalizedData.year,
          make: normalizedData.make,
          model: normalizedData.model,
          trim: normalizedData.trim,
          bodyType: normalizedData.bodyType,
          driveType: normalizedData.driveType,
          transmission: normalizedData.transmission,
          engine: normalizedData.engine,
          // Include raw NHTSA data for additional fields
          raw: decoded,
        },
        photos,
      },
      {
        headers: {
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': (rateLimitCheck.remaining - 1).toString(),
          'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
        },
      }
    )
  } catch (error: any) {
    console.error('VIN lookup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to lookup VIN' },
      { status: 500 }
    )
  }
}
