/**
 * Suspend User Account
 * Only accessible to Super Admin
 * 
 * POST /api/admin/users/:id/suspend
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/utils/roleHierarchy'
import { logAuditEvent } from '@/lib/security/auditLog'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get requester profile and role
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!requesterProfile || !isSuperAdmin(requesterProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    const adminSupabase = createAdminClient()

    // Get profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('id', id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Suspend auth user by setting user metadata
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(profile.user_id)
    const { error: suspendError } = await adminSupabase.auth.admin.updateUserById(
      profile.user_id,
      {
        user_metadata: {
          ...authUser?.user?.user_metadata,
          banned: true,
          banned_at: new Date().toISOString(),
          banned_by: requesterProfile.id,
        },
        ban_duration: '876000h', // Effectively permanent until manually unsuspended
      }
    )

    if (suspendError) {
      throw suspendError
    }

    // Log audit event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logAuditEvent({
      user_id: requesterProfile.id,
      actor_role: requesterProfile.role || undefined,
      action: 'admin_user_suspend',
      resource_type: 'profile',
      resource_id: id,
      previous_state: { banned: false },
      new_state: { banned: true },
      notes: reason || undefined,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: 'User suspended successfully',
    })
  } catch (error: any) {
    console.error('Admin user suspend error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}