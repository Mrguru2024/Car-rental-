/**
 * MVR Screening Request Endpoint
 * POST /api/screenings/mvr/request
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMvrScreening, hasPolicyAcceptance } from '@/lib/screening/workflows'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'renter') {
      return NextResponse.json({ error: 'Only renters can request MVR screening' }, { status: 403 })
    }

    const body = await request.json()
    const { booking_id } = body

    // Check consent
    const hasConsent = await hasPolicyAcceptance(profile.id, 'renter_mvr_consent_v1', '1.0')
    if (!hasConsent) {
      return NextResponse.json(
        { error: 'MVR consent required. Please accept the screening consent policy first.' },
        { status: 403 }
      )
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Run MVR screening
    const result = await runMvrScreening(profile.id, booking_id || null, ipAddress, userAgent)

    return NextResponse.json({
      success: true,
      screening_id: result.screening_id,
      status: result.status,
      result: result.result,
      risk_level: result.risk_level,
    })
  } catch (error: any) {
    console.error('MVR screening request error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to request MVR screening' },
      { status: 500 }
    )
  }
}
