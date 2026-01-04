/**
 * Admin BYOI Document Decision Endpoint
 * Allows admins to approve/reject BYOI documents with audit logging
 * 
 * POST /api/admin/byoi/:id/decision
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
    const { status, admin_notes } = body

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
      .from('byoi_documents')
      .select('status, policyholder_name')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'BYOI document not found' }, { status: 404 })
    }

    const previousState = { status: current.status }

    // Update BYOI document status
    const { error: updateError } = await supabase
      .from('byoi_documents')
      .update({
        status,
        admin_notes: admin_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    const newState = { status, admin_notes: admin_notes || null }

    // Get IP and user agent from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role || undefined,
      action: `admin_byoi_${status}`,
      resource_type: 'byoi_document',
      resource_id: id,
      previous_state: previousState,
      new_state: newState,
      notes: admin_notes || undefined,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: `BYOI document ${status} successfully`,
      previous_state: previousState,
      new_state: newState,
    })
  } catch (error: any) {
    console.error('Admin BYOI decision error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
