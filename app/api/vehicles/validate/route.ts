/**
 * Vehicle Listing Validation API
 * POST /api/vehicles/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateVehicleListing, computeVehicleTier } from '@/lib/vehicle-tiers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { model_year, title_type, inspection_status, photos_count } = body

    // Validate input
    if (!model_year || !title_type || !inspection_status) {
      return NextResponse.json(
        { error: 'Missing required fields: model_year, title_type, inspection_status' },
        { status: 400 }
      )
    }

    const result = validateVehicleListing({
      model_year: Number(model_year),
      title_type,
      inspection_status,
      photos_count: photos_count ? Number(photos_count) : undefined,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Vehicle validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
