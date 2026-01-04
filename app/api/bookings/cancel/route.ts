import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

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
    const { booking_id, reason } = body

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

    // Check permissions - renter can cancel their own, dealer can cancel their vehicle bookings
    const isRenter = profile.role === 'renter' && booking.renter_id === profile.id
    const isDealer =
      (profile.role === 'dealer' || profile.role === 'private_host') &&
      (booking.vehicles as any).dealer_id === profile.id

    if (!isRenter && !isDealer) {
      return NextResponse.json({ error: 'Unauthorized to cancel this booking' }, { status: 403 })
    }

    // Check if already canceled
    if (booking.status === 'canceled') {
      return NextResponse.json({ error: 'Booking already canceled' }, { status: 400 })
    }

    // Only allow cancellation of confirmed or pending_payment bookings
    if (booking.status !== 'confirmed' && booking.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Only confirmed or pending bookings can be canceled' },
        { status: 400 }
      )
    }

    // Calculate refund based on cancellation policy
    // Full refund if canceled 48+ hours before start date
    // 50% refund if canceled 24-48 hours before
    // No refund if canceled less than 24 hours before
    const startDate = new Date(booking.start_date)
    const now = new Date()
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    let refundAmountCents = 0
    let refundStatus: 'pending' | 'processed' | 'failed' | 'none' = 'none'

    if (hoursUntilStart >= 48) {
      // Full refund (including plan fees)
      refundAmountCents = booking.total_price * 100
      refundStatus = 'pending'
    } else if (hoursUntilStart >= 24) {
      // 50% refund of base price, full refund of plan fees
      const basePriceCents = (booking.total_price * 100) - (booking.plan_fee_cents || 0)
      refundAmountCents = Math.floor(basePriceCents / 2) + (booking.plan_fee_cents || 0)
      refundStatus = 'pending'
    } else {
      // No refund of base price, but refund plan fees if applicable
      refundAmountCents = booking.plan_fee_cents || 0
      refundStatus = refundAmountCents > 0 ? 'pending' : 'none'
    }

    // Handle Stripe transfer reversal if already paid to dealer
    if (booking.stripe_transfer_id && booking.payout_status === 'transferred') {
      try {
        // Attempt to reverse the transfer
        // Note: Stripe doesn't support direct transfer reversal, so we need to create a reverse transfer
        const { data: dealer } = await supabase
          .from('profiles')
          .select('stripe_connect_account_id')
          .eq('id', (booking.vehicles as any).dealer_id)
          .single()

        if (dealer?.stripe_connect_account_id) {
          // Create a reverse transfer (negative amount)
          // This requires the dealer's Connect account ID
          const reverseTransfer = await stripe.transfers.create({
            amount: -Math.min(refundAmountCents, booking.dealer_payout_amount_cents || 0),
            currency: 'usd',
            destination: dealer.stripe_connect_account_id,
            metadata: {
              type: 'cancellation_reversal',
              original_booking_id: booking_id,
              original_transfer_id: booking.stripe_transfer_id,
            },
          })

          console.log(`Reverse transfer created: ${reverseTransfer.id} for booking ${booking_id}`)
        }
      } catch (transferError: any) {
        console.error('Failed to reverse transfer:', transferError)
        // Continue with refund even if transfer reversal fails
        // This should be handled manually by support
      }
    }

    // Process refund if applicable
    if (refundStatus === 'pending' && booking.stripe_payment_intent_id && refundAmountCents > 0) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          booking.stripe_payment_intent_id
        )

        if (paymentIntent.status === 'succeeded') {
          // Create refund
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripe_payment_intent_id,
            amount: refundAmountCents,
            reason: 'requested_by_customer',
          })

          if (refund.status === 'succeeded' || refund.status === 'pending') {
            refundStatus = 'processed'
          } else {
            refundStatus = 'failed'
          }
        }
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError)
        refundStatus = 'failed'
      }
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        canceled_by: profile.id,
        cancellation_reason: reason || null,
        refund_amount_cents: refundAmountCents,
        refund_status: refundStatus,
        refund_processed_at: refundStatus === 'processed' ? new Date().toISOString() : null,
      })
      .eq('id', booking_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
    }

    return NextResponse.json({
      booking: updatedBooking,
      refund: {
        amount: refundAmountCents / 100,
        status: refundStatus,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/bookings/cancel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
