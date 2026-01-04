/**
 * Soft Credit Screening Request Endpoint
 * POST /api/screenings/soft-credit/request
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runSoftCreditScreening, hasPolicyAcceptance } from '@/lib/screening/workflows'

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
      return NextResponse.json(
        { error: 'Only renters can request soft credit screening' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { booking_id, reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required for soft credit screening' }, { status: 400 })
    }

    // Check consent
    const hasConsent = await hasPolicyAcceptance(profile.id, 'renter_soft_credit_consent_v1', '1.0')
    if (!hasConsent) {
      return NextResponse.json(
        {
          error: 'Soft credit consent required. Please accept the screening consent policy first.',
        },
        { status: 403 }
      )
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Run soft credit screening
    const result = await runSoftCreditScreening(profile.id, booking_id || null, reason, ipAddress, userAgent)

    return NextResponse.json({
      success: true,
      screening_id: result.screening_id,
      status: result.status,
      result: result.result,
      risk_level: result.risk_level,
    })
  } catch (error: any) {
    console.error('Soft credit screening request error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to request soft credit screening' },
      { status: 500 }
    )
  }
}
