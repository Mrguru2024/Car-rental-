/**
 * Submit Complaint
 * POST /api/dealer/complaints/:id/submit
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/security/auditLog'
import { hasPolicyAcceptance } from '@/lib/policies/acceptance'

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

    const { id } = await params

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || (profile.role !== 'dealer' && profile.role !== 'private_host')) {
      return NextResponse.json({ error: 'Only dealers can submit complaints' }, { status: 403 })
    }

    // Get complaint
    const { data: complaint } = await supabase
      .from('dealer_complaints')
      .select('*')
      .eq('id', id)
      .eq('dealer_id', profile.id)
      .single()

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    if (complaint.status !== 'draft') {
      return NextResponse.json(
        { error: 'Complaint has already been submitted' },
        { status: 400 }
      )
    }

    // Check policy acceptance
    const hasAccepted = await hasPolicyAcceptance(
      profile.id,
      'dealer_complaint_terms',
      '1.0',
      'complaint',
      id,
      profile.role
    )

    if (!hasAccepted) {
      return NextResponse.json(
        {
          error: 'Policy acceptance required',
          policy_key: 'dealer_complaint_terms',
          policy_version: '1.0',
        },
        { status: 403 }
      )
    }

    // Update status to submitted
    const adminSupabase = createAdminClient()
    const { error: updateError } = await adminSupabase
      .from('dealer_complaints')
      .update({ status: 'submitted' })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to submit complaint:', updateError)
      return NextResponse.json({ error: 'Failed to submit complaint' }, { status: 500 })
    }

    // Log audit event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'COMPLAINT_SUBMITTED',
      resource_type: 'complaint',
      resource_id: id,
      details: {
        previous_status: 'draft',
        new_status: 'submitted',
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      complaint: {
        id,
        status: 'submitted',
      },
    })
  } catch (error: any) {
    console.error('Submit complaint error:', error)
    return NextResponse.json({ error: 'Failed to submit complaint' }, { status: 500 })
  }
}
