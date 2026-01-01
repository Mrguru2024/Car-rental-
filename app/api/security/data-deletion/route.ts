/**
 * GDPR Data Deletion Endpoint
 * Allows users to request account and data deletion
 */

import { createClient } from '@/lib/supabase/server'
import { deleteUserAccount, anonymizeUserData } from '@/lib/security/dataRetention'
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

    const body = await request.json()
    const { action } = body // 'anonymize' or 'delete'

    if (action === 'anonymize') {
      // Anonymize personal data (GDPR right to be forgotten)
      await anonymizeUserData(user.id)
      
      await logDataAccess(
        user.id,
        'user_data',
        user.id,
        { action: 'anonymize' },
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      )

      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          message: 'Personal data anonymized successfully',
        })
      )
    } else if (action === 'delete') {
      // Delete account and associated data
      await deleteUserAccount(user.id)
      
      await logDataAccess(
        user.id,
        'user_account',
        user.id,
        { action: 'delete' },
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      )

      // Sign out the user
      await supabase.auth.signOut()

      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          message: 'Account deleted successfully',
        })
      )
    } else {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Invalid action. Use "anonymize" or "delete"' },
          { status: 400 }
        )
      )
    }
  } catch (error: any) {
    console.error('Data deletion error:', error)
    return applySecurityHeaders(
      NextResponse.json(
        { error: 'Failed to process deletion request' },
        { status: 500 }
      )
    )
  }
}
