/**
 * Add Message to Complaint
 * POST /api/dealer/complaints/:id/messages
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/security/auditLog'

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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get complaint
    const { data: complaint } = await supabase
      .from('dealer_complaints')
      .select('*, bookings(renter_id, vehicles(dealer_id))')
      .eq('id', id)
      .single()

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    // Check if user is a party to the complaint
    const booking = (complaint as any).bookings
    const isDealer =
      (profile.role === 'dealer' || profile.role === 'private_host') &&
      booking.vehicles?.dealer_id === profile.id
    const isRenter = profile.role === 'renter' && booking.renter_id === profile.id
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isDealer && !isRenter && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to add messages to this complaint' }, { status: 403 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Determine sender role
    let senderRole = profile.role as string
    if (profile.role === 'private_host') {
      senderRole = 'dealer'
    }

    // Add message
    const adminSupabase = createAdminClient()
    const { data: complaintMessage, error: messageError } = await adminSupabase
      .from('complaint_messages')
      .insert({
        complaint_id: id,
        sender_id: profile.id,
        sender_role: senderRole as any,
        message: message.trim(),
      })
      .select()
      .single()

    if (messageError || !complaintMessage) {
      console.error('Failed to add message:', messageError)
      return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
    }

    // Log audit event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'COMPLAINT_MESSAGE_ADDED',
      resource_type: 'complaint',
      resource_id: id,
      details: {
        message_id: complaintMessage.id,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: complaintMessage,
    })
  } catch (error: any) {
    console.error('Add message error:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}
