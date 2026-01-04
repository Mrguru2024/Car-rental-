/**
 * Add Message to Dispute
 * POST /api/disputes/:id/messages
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAddMessage } from '@/lib/disputes/transitions'
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

    // Get dispute
    const { data: dispute } = await supabase
      .from('disputes')
      .select('*, bookings(renter_id, vehicles(dealer_id))')
      .eq('id', id)
      .single()

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Check if message can be added
    if (!canAddMessage(dispute.status as any)) {
      return NextResponse.json(
        { error: 'Cannot add messages to closed disputes' },
        { status: 400 }
      )
    }

    // Check if user is a party to the dispute
    const booking = (dispute as any).bookings
    const isRenter = profile.role === 'renter' && booking.renter_id === profile.id
    const isDealer =
      (profile.role === 'dealer' || profile.role === 'private_host') &&
      booking.vehicles?.dealer_id === profile.id
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isRenter && !isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to add messages to this dispute' }, { status: 403 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Determine sender role
    let senderRole = profile.role as string
    if (profile.role === 'private_host') {
      senderRole = 'dealer' // Treat private hosts as dealers for disputes
    }

    // Add message
    const adminSupabase = createAdminClient()
    const { data: disputeMessage, error: messageError } = await adminSupabase
      .from('dispute_messages')
      .insert({
        dispute_id: id,
        sender_id: profile.id,
        sender_role: senderRole as any,
        message: message.trim(),
      })
      .select()
      .single()

    if (messageError || !disputeMessage) {
      console.error('Failed to add message:', messageError)
      return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
    }

    // Update dispute status if needed
    // If status is 'open' and dealer responds, change to 'awaiting_response'
    // If status is 'awaiting_response' and renter responds, can stay or change to 'open'
    if (dispute.status === 'open' && (isDealer || isAdmin)) {
      await adminSupabase
        .from('disputes')
        .update({ status: 'awaiting_response' })
        .eq('id', id)
    }

    // Log audit event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'DISPUTE_MESSAGE_ADDED',
      resource_type: 'dispute',
      resource_id: id,
      details: {
        message_id: disputeMessage.id,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: disputeMessage,
    })
  } catch (error: any) {
    console.error('Add message error:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}
