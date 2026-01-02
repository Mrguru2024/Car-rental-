/**
 * API endpoint to trigger automated document verification bot checks
 * Can be called by scheduled jobs or Prime Admins
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  runDocumentVerificationBot,
  runBotChecksForPendingVerifications,
} from '@/lib/verification/documentVerificationBot'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Only allow Prime Admin or system calls
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    // Only Prime Admins can trigger bot checks
    if (profile?.role !== 'prime_admin') {
      return NextResponse.json({ error: 'Forbidden - Prime Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { profile_id, check_all_pending } = body

    if (check_all_pending) {
      // Run checks for all pending verifications
      const result = await runBotChecksForPendingVerifications()
      return NextResponse.json({ success: true, result })
    } else if (profile_id) {
      // Run check for specific profile
      const result = await runDocumentVerificationBot(profile_id)
      return NextResponse.json({ success: true, result })
    } else {
      return NextResponse.json({ error: 'profile_id or check_all_pending required' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Document verification bot check error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
