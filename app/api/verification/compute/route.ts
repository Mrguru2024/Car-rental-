/**
 * Manual endpoint to trigger verification computation
 * Can be called by scheduled jobs or admin
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { computeVerificationForUser } from '@/lib/verification/computeVerification'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Only allow admin or system calls
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const body = await request.json()
    const { user_id } = body

    // Admin can compute for any user, users can compute for themselves
    if (profile?.role !== 'admin' && user_id) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', user_id)
        .single()

      if (targetProfile?.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    const result = await computeVerificationForUser(user_id)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Verification computation error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * Nightly job endpoint - compute verification for all users
 * TODO: Set up Supabase scheduled function or external cron job
 */
export async function GET(request: Request) {
  try {
    // Check for secret token to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.VERIFICATION_JOB_SECRET

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all profiles
    const { data: profiles } = await supabase.from('profiles').select('id')

    if (!profiles) {
      return NextResponse.json({ error: 'No profiles found' }, { status: 404 })
    }

    const results = []
    for (const profile of profiles) {
      try {
        const result = await computeVerificationForUser(profile.id)
        results.push({ user_id: profile.id, ...result })
      } catch (error) {
        console.error(`Failed to compute verification for user ${profile.id}:`, error)
        results.push({ user_id: profile.id, error: 'Computation failed' })
      }
    }

    return NextResponse.json({ success: true, results, count: results.length })
  } catch (error: any) {
    console.error('Nightly verification job error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
