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

    // Get user profile to check role and onboarding completion
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, verification_status, id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Check if user has completed onboarding
    if (!profile) {
      return NextResponse.json({ 
        error: 'Please complete onboarding to book vehicles' 
      }, { status: 403 })
    }

    // Only renters can create bookings
    if (profile.role !== 'renter') {
      return NextResponse.json({ 
        error: 'Only renters can create bookings. Please update your profile.' 
      }, { status: 403 })
    }

    // Require verification approval before booking
    // Users can browse and submit verification, but cannot book until approved
    if (profile.verification_status !== 'approved') {
      if (profile.verification_status === 'rejected') {
        return NextResponse.json({ 
          error: 'Your verification was rejected. Please contact support or resubmit your verification documents.' 
        }, { status: 403 })
      }
      return NextResponse.json({ 
        error: 'Please complete verification and wait for approval before booking. Verification typically takes up to 48 hours.' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { vehicle_id, start_date, end_date } = body

    // Enhanced fraud guardrails (rate limiting and vehicle availability)
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const { guardBookingAttempt } = await import('@/lib/risk/bookingGuard')
    const guardResult = await guardBookingAttempt(profile.id, vehicle_id, ipAddress)
    
    if (!guardResult.allowed) {
      return NextResponse.json(
        { error: guardResult.reason || 'Booking not allowed' },
        { status: 403 }
      )
    }

    if (!vehicle_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate dates
    const start = new Date(start_date)
    const end = new Date(end_date)
    const now = new Date()

    if (start < now) {
      return NextResponse.json({ error: 'Start date must be in the future' }, { status: 400 })
    }

    if (end <= start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Check for overlapping bookings
    const { data: overlappingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('vehicle_id', vehicle_id)
      .in('status', ['pending_payment', 'confirmed'])
      .or(
        `and(start_date.lte.${end_date},end_date.gte.${start_date}),and(start_date.gte.${start_date},start_date.lte.${end_date}),and(end_date.gte.${start_date},end_date.lte.${end_date})`
      )

    if (overlappingBookings && overlappingBookings.length > 0) {
      return NextResponse.json(
        { error: 'Vehicle is not available for the selected dates' },
        { status: 400 }
      )
    }

    // Get vehicle to calculate price
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('price_per_day')
      .eq('id', vehicle_id)
      .single()

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Calculate total
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const subtotal = diffDays * vehicle.price_per_day
    const platformFee = subtotal * 0.1
    const totalPrice = subtotal + platformFee

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        renter_id: user.id,
        vehicle_id,
        start_date: start_date,
        end_date: end_date,
        total_price: totalPrice,
        status: 'draft',
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({ booking_id: booking.id })
  } catch (error: any) {
    console.error('Booking creation error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}