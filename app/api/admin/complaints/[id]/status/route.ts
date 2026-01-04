/**
 * Admin Complaint Status Update
 * POST /api/admin/complaints/:id/status
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    // Validate status
    const validStatuses = ['under_review', 'resolved', 'escalated', 'closed']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Require notes for resolved/closed
    if ((status === 'resolved' || status === 'closed') && (!notes || !notes.trim())) {
      return NextResponse.json(
        { error: 'Notes are required for resolved or closed status' },
        { status: 400 }
      )
    }

    // Get current complaint state
    const { data: current } = await supabase
      .from('dealer_complaints')
      .select('status')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    const previousState = { status: current.status }

    // Update status
    const adminSupabase = createAdminClient()
    const { error: updateError } = await adminSupabase
      .from('dealer_complaints')
      .update({ status: status as any })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update complaint status:', updateError)
      return NextResponse.json({ error: 'Failed to update complaint status' }, { status: 500 })
    }

    const newState = { status }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'COMPLAINT_STATUS_UPDATED',
      resource_type: 'complaint',
      resource_id: id,
      previous_state: previousState,
      new_state: newState,
      notes: notes?.trim() || undefined,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      complaint: {
        id,
        status,
      },
    })
  } catch (error: any) {
    console.error('Admin complaint status update error:', error)
    return NextResponse.json({ error: 'Failed to update complaint status' }, { status: 500 })
  }
}
