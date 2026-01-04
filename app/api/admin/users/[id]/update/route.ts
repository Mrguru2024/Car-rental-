/**
 * Update User Role and Status
 * Only accessible to Prime Admin and Super Admin
 * 
 * PATCH /api/admin/users/:id/update
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { logAuditEvent } from '@/lib/security/auditLog'
import { getPrimeAdminRoles, isRoleAllowed } from '@/lib/utils/roleHierarchy'

export async function PATCH(
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

    if (!requesterProfile || !isRoleAllowed(requesterProfile.role, getPrimeAdminRoles())) {
      return NextResponse.json(
        { error: 'Forbidden - Prime Admin or Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role, verification_status, notes } = body

    const { id } = await params

    // Get current state (previous_state)
    const adminSupabase = createAdminClient()
    const { data: currentProfile } = await adminSupabase
      .from('profiles')
      .select('role, verification_status, full_name, user_id')
      .eq('id', id)
      .single()

    if (!currentProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const previousState = {
      role: currentProfile.role,
      verification_status: currentProfile.verification_status,
    }

    // Build update object
    const updates: any = {}
    if (role && role !== currentProfile.role) {
      // Only super_admin can assign prime_admin or super_admin roles
      if ((role === 'prime_admin' || role === 'super_admin') && requesterProfile.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Only Super Admin can assign Prime Admin or Super Admin roles' },
          { status: 403 }
        )
      }
      updates.role = role
    }
    if (verification_status && verification_status !== currentProfile.verification_status) {
      updates.verification_status = verification_status
    }
    updates.updated_at = new Date().toISOString()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    // Update profile
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    const newState = {
      role: updates.role || currentProfile.role,
      verification_status: updates.verification_status || currentProfile.verification_status,
    }

    // Get IP and user agent from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log audit event
    await logAuditEvent({
      user_id: requesterProfile.id,
      actor_role: requesterProfile.role || undefined,
      action: 'admin_user_update',
      resource_type: 'profile',
      resource_id: id,
      previous_state: previousState,
      new_state: newState,
      notes: notes || undefined,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      previous_state: previousState,
      new_state: newState,
    })
  } catch (error: any) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
