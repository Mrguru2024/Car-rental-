/**
 * Create Dispute
 * POST /api/disputes
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isBookingEligibleForDispute } from '@/lib/disputes/workflows'
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

    if (!profile || profile.role !== 'renter') {
      return NextResponse.json({ error: 'Only renters can create disputes' }, { status: 403 })
    }

    const body = await request.json()
    const { booking_id, category, summary } = body

    if (!booking_id || !category || !summary) {
      return NextResponse.json(
        { error: 'booking_id, category, and summary are required' },
        { status: 400 }
      )
    }

    // Validate booking eligibility
    const eligibility = await isBookingEligibleForDispute(booking_id, profile.id)
    if (!eligibility.eligible) {
      return NextResponse.json({ error: eligibility.reason }, { status: 400 })
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Create dispute
    const adminSupabase = createAdminClient()
    const { data: dispute, error: disputeError } = await adminSupabase
      .from('disputes')
      .insert({
        booking_id,
        opened_by: profile.id,
        opened_by_role: 'renter',
        category,
        summary,
        status: 'open',
      })
      .select()
      .single()

    if (disputeError || !dispute) {
      console.error('Failed to create dispute:', disputeError)
      return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'DISPUTE_CREATED',
      resource_type: 'dispute',
      resource_id: dispute.id,
      details: {
        booking_id,
        category,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    // TODO: Notify dealer if notification system exists

    return NextResponse.json({
      success: true,
      dispute: {
        id: dispute.id,
        booking_id: dispute.booking_id,
        category: dispute.category,
        status: dispute.status,
        summary: dispute.summary,
        created_at: dispute.created_at,
      },
    })
  } catch (error: any) {
    console.error('Create dispute error:', error)
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
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
      .from('disputes')
      .select('id, booking_id, category, status, summary, created_at, updated_at')
      .order('created_at', { ascending: false })

    // Renters see their own disputes
    if (profile.role === 'renter') {
      query = query.eq('opened_by', profile.id)
    }

    // Dealers see disputes for their vehicle bookings
    if (profile.role === 'dealer' || profile.role === 'private_host') {
      // Get vehicle IDs for this dealer
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('dealer_id', profile.id)

      const vehicleIds = vehicles?.map((v) => v.id) || []

      if (vehicleIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id')
          .in('vehicle_id', vehicleIds)

        const bookingIds = bookings?.map((b) => b.id) || []
        if (bookingIds.length > 0) {
          query = query.in('booking_id', bookingIds)
        } else {
          // No bookings, return empty
          return NextResponse.json({ success: true, disputes: [] })
        }
      } else {
        // No vehicles, return empty
        return NextResponse.json({ success: true, disputes: [] })
      }
    }

    // Admins see all
    // (RLS handles this, but we can optimize the query)

    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data: disputes, error } = await query

    if (error) {
      console.error('Get disputes error:', error)
      return NextResponse.json({ error: 'Failed to get disputes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      disputes: disputes || [],
    })
  } catch (error: any) {
    console.error('Get disputes error:', error)
    return NextResponse.json({ error: 'Failed to get disputes' }, { status: 500 })
  }
}
