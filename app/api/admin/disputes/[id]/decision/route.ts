/**
 * Admin Dispute Decision Endpoint
 * POST /api/admin/disputes/:id/decision
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/security/auditLog'
import { getAdminRoles, isRoleAllowed } from '@/lib/utils/roleHierarchy'
import { validateStatusTransition, decisionToStatus } from '@/lib/disputes/transitions'

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
    const { decision, notes } = body

    // Validate decision
    const validDecisions = [
      'no_action',
      'partial_refund',
      'full_refund',
      'fee_waived',
      'escalate_to_coverage',
      'close',
    ]

    if (!decision || !validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` },
        { status: 400 }
      )
    }

    if (!notes || !notes.trim()) {
      return NextResponse.json({ error: 'Notes are required for decisions' }, { status: 400 })
    }

    // Get current dispute state
    const { data: current } = await supabase
      .from('disputes')
      .select('status')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    const previousState = { status: current.status }

    // Determine new status based on decision
    const newStatus = decisionToStatus(decision as any)

    // Validate transition
    const validation = validateStatusTransition(profile.role as any, current.status as any, newStatus)
    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }

    // Create decision record (immutable)
    const adminSupabase = createAdminClient()
    const { data: decisionRecord, error: decisionError } = await adminSupabase
      .from('dispute_decisions')
      .insert({
        dispute_id: id,
        decided_by: profile.id,
        decided_by_role: profile.role as any,
        decision: decision as any,
        notes: notes.trim(),
      })
      .select()
      .single()

    if (decisionError || !decisionRecord) {
      console.error('Failed to create decision:', decisionError)
      return NextResponse.json({ error: 'Failed to create decision' }, { status: 500 })
    }

    // Update dispute status
    const { error: updateError } = await adminSupabase
      .from('disputes')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update dispute status:', updateError)
      return NextResponse.json({ error: 'Failed to update dispute status' }, { status: 500 })
    }

    const newState = { status: newStatus }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'DISPUTE_DECISION',
      resource_type: 'dispute',
      resource_id: id,
      previous_state: previousState,
      new_state: newState,
      details: {
        decision: decision,
        decision_id: decisionRecord.id,
      },
      notes: notes.trim(),
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      decision: decisionRecord,
      dispute: {
        id,
        status: newStatus,
      },
    })
  } catch (error: any) {
    console.error('Admin dispute decision error:', error)
    return NextResponse.json({ error: 'Failed to process decision' }, { status: 500 })
  }
}
