/**
 * Get Dispute Details
 * GET /api/disputes/:id
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkDealerResponseWindow } from '@/lib/disputes/workflows'

export async function GET(
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

    // Check dealer response window (lazy evaluation)
    await checkDealerResponseWindow(id)

    // Get dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single()

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Get messages
    const { data: messages } = await supabase
      .from('dispute_messages')
      .select('*, profiles!dispute_messages_sender_id_fkey(id, full_name)')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true })

    // Get evidence
    const { data: evidence } = await supabase
      .from('dispute_evidence')
      .select('*')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true })

    // Get decisions
    const { data: decisions } = await supabase
      .from('dispute_decisions')
      .select('*, profiles!dispute_decisions_decided_by_fkey(id, full_name, role)')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true })

    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, vehicles(id, make, model, year)')
      .eq('id', dispute.booking_id)
      .single()

    return NextResponse.json({
      success: true,
      dispute: {
        ...dispute,
        messages: messages || [],
        evidence: evidence || [],
        decisions: decisions || [],
        booking: booking || null,
      },
    })
  } catch (error: any) {
    console.error('Get dispute error:', error)
    return NextResponse.json({ error: 'Failed to get dispute' }, { status: 500 })
  }
}
