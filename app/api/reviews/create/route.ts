import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'renter') {
      return NextResponse.json({ error: 'Only renters can create reviews' }, { status: 403 })
    }

    const body = await request.json()
    const { booking_id, vehicle_rating, dealer_rating, vehicle_review, dealer_review } = body

    // Validate required fields
    if (!booking_id || !vehicle_rating || !dealer_rating) {
      return NextResponse.json(
        { error: 'Missing required fields: booking_id, vehicle_rating, dealer_rating' },
        { status: 400 }
      )
    }

    // Validate ratings
    if (vehicle_rating < 1 || vehicle_rating > 5 || dealer_rating < 1 || dealer_rating > 5) {
      return NextResponse.json({ error: 'Ratings must be between 1 and 5' }, { status: 400 })
    }

    // Verify booking exists and belongs to renter
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, vehicles(dealer_id)')
      .eq('id', booking_id)
      .eq('renter_id', profile.id)
      .eq('status', 'completed')
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or not eligible for review' },
        { status: 404 }
      )
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .single()

    if (existingReview) {
      return NextResponse.json({ error: 'Review already exists for this booking' }, { status: 400 })
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id,
        renter_id: profile.id,
        vehicle_id: booking.vehicle_id,
        dealer_id: (booking.vehicles as any).dealer_id,
        vehicle_rating,
        dealer_rating,
        vehicle_review: vehicle_review || null,
        dealer_review: dealer_review || null,
        status: 'published',
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/reviews/create:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
