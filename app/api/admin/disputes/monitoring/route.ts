/**
 * Get Disputes for Monitoring (Super Admin Only)
 * GET /api/admin/disputes/monitoring
 * 
 * Returns all disputes with full workflow data including messages, evidence, decisions
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { protectRoute } from '@/lib/security/routeProtection'

export async function GET(request: Request) {
  try {
    // Protect route - only super_admin can access
    const { user, profile } = await protectRoute({
      requireAuth: true,
      requireRole: 'super_admin',
      redirectTo: '/',
    })

    if (!user || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized - Super Admin only' }, { status: 403 })
    }

    // Use admin client to bypass RLS for comprehensive dispute monitoring
    const adminSupabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    // Build query for disputes (using admin client to bypass RLS)
    let disputesQuery = adminSupabase
      .from('disputes')
      .select(
        '*, bookings(id, start_date, end_date, status, vehicles(id, make, model, year), profiles!bookings_renter_id_fkey(id, full_name)), profiles!disputes_opened_by_fkey(id, full_name, role)'
      )
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      disputesQuery = disputesQuery.eq('status', status)
    }

    if (category && category !== 'all') {
      disputesQuery = disputesQuery.eq('category', category)
    }

    const { data: disputes, error: disputesError } = await disputesQuery.limit(100)

    if (disputesError) {
      throw disputesError
    }

    if (!disputes || disputes.length === 0) {
      return NextResponse.json({ success: true, disputes: [], workflowData: {} })
    }

    // Get all related workflow data for all disputes
    const disputeIds = disputes.map((d) => d.id)

    // Fetch messages for all disputes (using admin client)
    const { data: messages } = await adminSupabase
      .from('dispute_messages')
      .select('*, profiles!dispute_messages_sender_id_fkey(id, full_name, role)')
      .in('dispute_id', disputeIds)
      .order('created_at', { ascending: true })

    // Fetch evidence for all disputes (using admin client)
    const { data: evidence } = await adminSupabase
      .from('dispute_evidence')
      .select('*, profiles!dispute_evidence_uploaded_by_fkey(id, full_name, role)')
      .in('dispute_id', disputeIds)
      .order('created_at', { ascending: true })

    // Fetch decisions for all disputes (using admin client)
    const { data: decisions } = await adminSupabase
      .from('dispute_decisions')
      .select('*, profiles!dispute_decisions_decided_by_fkey(id, full_name, role)')
      .in('dispute_id', disputeIds)
      .order('created_at', { ascending: true })

    // Group workflow data by dispute_id
    const workflowData: Record<
      string,
      {
        messages: any[]
        evidence: any[]
        decisions: any[]
      }
    > = {}

    disputes.forEach((dispute) => {
      workflowData[dispute.id] = {
        messages: messages?.filter((m) => m.dispute_id === dispute.id) || [],
        evidence: evidence?.filter((e) => e.dispute_id === dispute.id) || [],
        decisions: decisions?.filter((d) => d.dispute_id === dispute.id) || [],
      }
    })

    return NextResponse.json({
      success: true,
      disputes,
      workflowData,
    })
  } catch (error: any) {
    console.error('Error fetching disputes for monitoring:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}