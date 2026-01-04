/**
 * Prime Admin Audit Endpoint
 * Allows Prime Admins and Super Admins to audit/reverse/flag admin decisions
 * 
 * POST /api/prime-admin/audits/:entity/:id
 * 
 * Entity types: 'verification', 'byoi', 'claim', 'booking'
 * Actions: 'approve', 'reverse', 'flag', 'lock'
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuditEvent } from '@/lib/security/auditLog'
import { getPrimeAdminRoles, isRoleAllowed } from '@/lib/utils/roleHierarchy'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entity: string; id: string }> }
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

    const body = await request.json()
    const { action, notes } = body

    // Validate action
    const allowedActions = ['approve', 'reverse', 'flag', 'lock']
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${allowedActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Require notes for reverse/flag/lock actions
    if (['reverse', 'flag', 'lock'].includes(action) && !notes?.trim()) {
      return NextResponse.json(
        { error: 'Notes are required for reverse, flag, and lock actions' },
        { status: 400 }
      )
    }

    const { entity, id } = await params
    let previousState: any = null
    let newState: any = null
    let success = false

    // Get IP and user agent from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Handle different entity types
    switch (entity) {
      case 'verification': {
        // Get current state
        const { data: current } = await supabase
          .from('profiles')
          .select('verification_status, role')
          .eq('id', id)
          .single()

        if (!current) {
          return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
        }

        previousState = { verification_status: current.verification_status }

        // Apply action
        if (action === 'reverse') {
          // Reverse to previous status (default to pending)
          const { error } = await supabase
            .from('profiles')
            .update({ verification_status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { verification_status: 'pending' }
          success = true
        } else if (action === 'approve') {
          const { error } = await supabase
            .from('profiles')
            .update({ verification_status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { verification_status: 'approved' }
          success = true
        } else if (action === 'flag') {
          const { error } = await supabase
            .from('profiles')
            .update({ verification_status: 'flagged', updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { verification_status: 'flagged' }
          success = true
        }
        break
      }

      case 'byoi': {
        // Get current state
        const { data: current } = await supabase
          .from('byoi_documents')
          .select('status')
          .eq('id', id)
          .single()

        if (!current) {
          return NextResponse.json({ error: 'BYOI document not found' }, { status: 404 })
        }

        previousState = { status: current.status }

        // Apply action
        if (action === 'reverse') {
          const { error } = await supabase
            .from('byoi_documents')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { status: 'pending' }
          success = true
        } else if (action === 'approve') {
          const { error } = await supabase
            .from('byoi_documents')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { status: 'approved' }
          success = true
        } else if (action === 'flag') {
          const { error } = await supabase
            .from('byoi_documents')
            .update({ status: 'rejected', admin_notes: notes, updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { status: 'rejected' }
          success = true
        }
        break
      }

      case 'claim': {
        // Get current state
        const { data: current } = await supabase
          .from('claims')
          .select('status')
          .eq('id', id)
          .single()

        if (!current) {
          return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
        }

        previousState = { status: current.status }

        // Apply action
        if (action === 'reverse') {
          const { error } = await supabase
            .from('claims')
            .update({ status: 'submitted', updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { status: 'submitted' }
          success = true
        } else if (action === 'flag') {
          const { error } = await supabase
            .from('claims')
            .update({ status: 'in_review', admin_notes: notes, updated_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error
          newState = { status: 'in_review' }
          success = true
        }
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown entity type: ${entity}. Allowed: verification, byoi, claim` },
          { status: 400 }
        )
    }

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role || undefined,
      action: `prime_admin_${action}`,
      resource_type: entity,
      resource_id: id,
      previous_state: previousState,
      new_state: newState,
      notes: notes || undefined,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
    })

    return NextResponse.json({
      success: true,
      message: `Action ${action} completed successfully`,
      previous_state: previousState,
      new_state: newState,
    })
  } catch (error: any) {
    console.error('Prime Admin audit error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
