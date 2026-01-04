/**
 * Policy Acceptance Endpoint
 * POST /api/screenings/policy/accept
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordPolicyAcceptance, recordScreeningConsent } from '@/lib/screening/workflows'
import crypto from 'crypto'

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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { policy_key, policy_version, consent_type, booking_id } = body

    if (!policy_key || !policy_version) {
      return NextResponse.json(
        { error: 'policy_key and policy_version are required' },
        { status: 400 }
      )
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''

    // Hash IP for privacy (only store hash)
    const ipHash = ipAddress ? crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16) : undefined

    // Record policy acceptance
    await recordPolicyAcceptance(profile.id, policy_key, policy_version, ipHash, userAgent)

    // If this is a screening consent, also record it
    if (consent_type && (consent_type === 'mvr' || consent_type === 'soft_credit')) {
      await recordScreeningConsent(
        profile.id,
        booking_id || null,
        consent_type,
        policy_key,
        policy_version,
        ipHash,
        userAgent
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Policy accepted',
    })
  } catch (error: any) {
    console.error('Policy acceptance error:', error)
    return NextResponse.json({ error: 'Failed to record policy acceptance' }, { status: 500 })
  }
}
