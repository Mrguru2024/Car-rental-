/**
 * Get Complaint Details
 * GET /api/dealer/complaints/:id
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get complaint
    const { data: complaint, error: complaintError } = await supabase
      .from('dealer_complaints')
      .select('*')
      .eq('id', id)
      .single()

    if (complaintError || !complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    // Get messages
    const { data: messages } = await supabase
      .from('complaint_messages')
      .select('*, profiles!complaint_messages_sender_id_fkey(id, full_name)')
      .eq('complaint_id', id)
      .order('created_at', { ascending: true })

    // Get evidence
    const { data: evidence } = await supabase
      .from('complaint_evidence')
      .select('*')
      .eq('complaint_id', id)
      .order('created_at', { ascending: true })

    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, vehicles(id, make, model, year)')
      .eq('id', complaint.booking_id)
      .single()

    return NextResponse.json({
      success: true,
      complaint: {
        ...complaint,
        messages: messages || [],
        evidence: evidence || [],
        booking: booking || null,
      },
    })
  } catch (error: any) {
    console.error('Get complaint error:', error)
    return NextResponse.json({ error: 'Failed to get complaint' }, { status: 500 })
  }
}
