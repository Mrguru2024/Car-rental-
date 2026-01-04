/**
 * Dealer Complaints Endpoints
 * POST /api/dealer/complaints - Create complaint
 * GET /api/dealer/complaints - List complaints
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/security/auditLog'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || (profile.role !== 'dealer' && profile.role !== 'private_host')) {
      return NextResponse.json({ error: 'Only dealers can create complaints' }, { status: 403 })
    }

    const body = await request.json()
    const { booking_id, category, summary } = body

    if (!booking_id || !category || !summary) {
      return NextResponse.json(
        { error: 'booking_id, category, and summary are required' },
        { status: 400 }
      )
    }

    // Verify booking belongs to dealer
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, vehicles(dealer_id), profiles!bookings_renter_id_fkey(id)')
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const dealerId = (booking.vehicles as any).dealer_id
    if (dealerId !== profile.id) {
      return NextResponse.json({ error: 'Booking does not belong to dealer' }, { status: 403 })
    }

    // Check booking status (must be confirmed/completed/canceled after start)
    const bookingStatus = booking.status
    const allowedStatuses = ['confirmed', 'completed']
    const isCanceledAfterStart =
      bookingStatus === 'canceled' && new Date(booking.start_date) <= new Date()

    if (!allowedStatuses.includes(bookingStatus) && !isCanceledAfterStart) {
      return NextResponse.json(
        { error: 'Cannot create complaint for this booking status' },
        { status: 400 }
      )
    }

    const renterId = (booking.profiles as any).id

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Create complaint (draft status)
    const adminSupabase = createAdminClient()
    const { data: complaint, error: complaintError } = await adminSupabase
      .from('dealer_complaints')
      .insert({
        booking_id,
        dealer_id: profile.id,
        renter_id: renterId,
        category,
        summary,
        status: 'draft',
      })
      .select()
      .single()

    if (complaintError || !complaint) {
      console.error('Failed to create complaint:', complaintError)
      return NextResponse.json({ error: 'Failed to create complaint' }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'COMPLAINT_CREATED',
      resource_type: 'complaint',
      resource_id: complaint.id,
      details: {
        booking_id,
        category,
        status: 'draft',
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      complaint: {
        id: complaint.id,
        booking_id: complaint.booking_id,
        category: complaint.category,
        status: complaint.status,
        summary: complaint.summary,
        created_at: complaint.created_at,
      },
    })
  } catch (error: any) {
    console.error('Create complaint error:', error)
    return NextResponse.json({ error: 'Failed to create complaint' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    let query = supabase
      .from('dealer_complaints')
      .select('id, booking_id, category, status, summary, created_at, updated_at')
      .order('created_at', { ascending: false })

    // Dealers see their complaints
    if (profile.role === 'dealer' || profile.role === 'private_host') {
      query = query.eq('dealer_id', profile.id)
    }

    // Renters see complaints about them
    if (profile.role === 'renter') {
      query = query.eq('renter_id', profile.id)
    }

    // Admins see all (RLS handles this)

    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data: complaints, error } = await query

    if (error) {
      console.error('Get complaints error:', error)
      return NextResponse.json({ error: 'Failed to get complaints' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      complaints: complaints || [],
    })
  } catch (error: any) {
    console.error('Get complaints error:', error)
    return NextResponse.json({ error: 'Failed to get complaints' }, { status: 500 })
  }
}
