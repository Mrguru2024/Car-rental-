/**
 * Admin Verification Decision Endpoint
 * Allows admins to approve/reject user verifications with audit logging
 * 
 * POST /api/admin/verifications/:id/decision
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuditEvent } from '@/lib/security/auditLog'
import { getAdminRoles, isRoleAllowed } from '@/lib/utils/roleHierarchy'

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

    // Get user profile and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !isRoleAllowed(profile.role, getAdminRoles())) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, notes } = body

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    const { id } = await params

    // Get current state (previous_state)
    const { data: current } = await supabase
      .from('profiles')
      .select('verification_status, role, full_name')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }

    const previousState = { verification_status: current.verification_status }

    // Update verification status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    const newState = { verification_status: status }

    // Get IP and user agent from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role || undefined,
      action: `admin_verification_${status}`,
      resource_type: 'verification',
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
      message: `Verification ${status} successfully`,
      previous_state: previousState,
      new_state: newState,
    })
  } catch (error: any) {
    console.error('Admin verification decision error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
