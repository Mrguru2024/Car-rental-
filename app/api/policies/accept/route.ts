/**
 * Policy Acceptance Endpoint
 * POST /api/policies/accept
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordPolicyAcceptance } from '@/lib/policies/acceptance'
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
    const { policy_key, policy_version, context_type, context_id, role } = body

    if (!policy_key || !policy_version) {
      return NextResponse.json(
        { error: 'policy_key and policy_version are required' },
        { status: 400 }
      )
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''

    // Hash IP for privacy
    const ipHash = ipAddress ? crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16) : undefined

    // Record policy acceptance
    await recordPolicyAcceptance(
      profile.id,
      policy_key,
      policy_version,
      context_type || undefined,
      context_id !== undefined ? context_id : undefined,
      role || profile.role || undefined,
      ipHash,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Policy accepted',
    })
  } catch (error: any) {
    console.error('Policy acceptance error:', error)
    return NextResponse.json({ error: 'Failed to record policy acceptance' }, { status: 500 })
  }
}
