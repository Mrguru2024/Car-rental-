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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { booking_id } = body

    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, vehicles(dealer_id)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check permissions - renter can complete their own, dealer can complete their vehicle bookings
    const isRenter = profile.role === 'renter' && booking.renter_id === profile.id
    const isDealer =
      (profile.role === 'dealer' || profile.role === 'private_host') &&
      (booking.vehicles as any).dealer_id === profile.id

    if (!isRenter && !isDealer) {
      return NextResponse.json({ error: 'Unauthorized to complete this booking' }, { status: 403 })
    }

    // Only allow completion of confirmed bookings
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only confirmed bookings can be marked as completed' },
        { status: 400 }
      )
    }

    // Check if end date has passed (optional - can allow early completion)
    const endDate = new Date(booking.end_date)
    const now = new Date()
    
    // Allow completion if end date has passed or within 24 hours before end date
    const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilEnd > 24) {
      return NextResponse.json(
        { error: 'Booking cannot be completed more than 24 hours before end date' },
        { status: 400 }
      )
    }

    // Update booking to completed
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to complete booking' }, { status: 500 })
    }

    return NextResponse.json({ booking: updatedBooking })
  } catch (error) {
    console.error('Error in POST /api/bookings/complete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
