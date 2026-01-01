/**
 * GDPR Data Export Endpoint
 * Allows users to export their personal data
 */

import { createClient } from '@/lib/supabase/server'
import { exportUserData } from '@/lib/security/dataRetention'
import { logDataAccess } from '@/lib/security/auditLog'
import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/securityHeaders'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    }

    // Export user data
    const userData = await exportUserData(user.id)

    // Log the export
    await logDataAccess(
      user.id,
      'user_data',
      user.id,
      { action: 'export' },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: userData,
        exported_at: new Date().toISOString(),
      })
    )
  } catch (error: any) {
    console.error('Data export error:', error)
    return applySecurityHeaders(
      NextResponse.json(
        { error: 'Failed to export data' },
        { status: 500 }
      )
    )
  }
}
