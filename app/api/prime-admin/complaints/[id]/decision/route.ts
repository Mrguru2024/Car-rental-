/**
 * Prime Admin Complaint Override
 * POST /api/prime-admin/complaints/:id/decision
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/security/auditLog'
import { getPrimeAdminRoles, isRoleAllowed } from '@/lib/utils/roleHierarchy'

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

    if (!profile || !isRoleAllowed(profile.role, getPrimeAdminRoles())) {
      return NextResponse.json(
        { error: 'Forbidden - Prime Admin or Super Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { decision, notes } = body

    // Validate decision
    const validDecisions = ['reverse', 'flag', 'lock', 'close']
    if (!decision || !validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` },
        { status: 400 }
      )
    }

    if (!notes || !notes.trim()) {
      return NextResponse.json({ error: 'Notes are required for override decisions' }, { status: 400 })
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

    // Map decision to status
    const decisionStatusMap: Record<string, string> = {
      reverse: 'submitted',
      flag: 'under_review',
      lock: 'closed',
      close: 'closed',
    }
    const newStatus = decisionStatusMap[decision]

    // Update status
    const adminSupabase = createAdminClient()
    const { error: updateError } = await adminSupabase
      .from('dealer_complaints')
      .update({ status: newStatus as any })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update complaint status:', updateError)
      return NextResponse.json({ error: 'Failed to update complaint status' }, { status: 500 })
    }

    const newState = { status: newStatus }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'COMPLAINT_PRIME_ADMIN_OVERRIDE',
      resource_type: 'complaint',
      resource_id: id,
      previous_state: previousState,
      new_state: newState,
      details: {
        decision: decision,
        override: true,
      },
      notes: notes.trim(),
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      complaint: {
        id,
        status: newStatus,
      },
      previous_state: previousState,
      new_state: newState,
    })
  } catch (error: any) {
    console.error('Prime admin complaint override error:', error)
    return NextResponse.json({ error: 'Failed to process override decision' }, { status: 500 })
  }
}
