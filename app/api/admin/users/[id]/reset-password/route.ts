/**
 * Reset User Password (Super Admin Only)
 * Sends password reset email to user
 * 
 * POST /api/admin/users/:id/reset-password
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

    const adminSupabase = createAdminClient()

    // Get profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('user_id, email')
      .eq('id', id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get auth user to get email
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(profile.user_id)
    if (!authUser?.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email,
    })

    if (resetError) {
      throw resetError
    }

    // Log audit event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logAuditEvent({
      user_id: requesterProfile.id,
      actor_role: requesterProfile.role || undefined,
      action: 'admin_password_reset',
      resource_type: 'profile',
      resource_id: id,
      notes: `Password reset link generated for ${authUser.user.email}`,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated',
      data: {
        resetLink: resetData.properties?.action_link,
        email: authUser.user.email,
      },
    })
  } catch (error: any) {
    console.error('Admin password reset error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}