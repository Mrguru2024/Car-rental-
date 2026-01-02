import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTransfer } from '@/lib/stripe/connect'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      const supabase = createAdminClient()
      const bookingId = session.metadata?.bookingId

      if (!bookingId) {
        console.error('Missing bookingId in session metadata')
        return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
      }

      // Fetch booking
      const { data: booking, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('*, vehicles(dealer_id)')
        .eq('id', bookingId)
        .single()

      if (bookingFetchError || !booking) {
        console.error('Failed to fetch booking:', bookingFetchError)
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      const vehicle = booking.vehicles as { dealer_id: string }

      // Fetch dealer profile with Connect account info
      const { data: dealer, error: dealerError } = await supabase
        .from('profiles')
        .select('id, stripe_connect_account_id')
        .eq('id', vehicle.dealer_id)
        .single()

      if (dealerError || !dealer) {
        console.error('Failed to fetch dealer:', dealerError)
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
      }

      // Update booking to confirmed
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Failed to update booking:', updateError)
        return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
      }

      // Transfer funds to dealer/host Connect account
      if (dealer.stripe_connect_account_id && booking.dealer_payout_amount_cents) {
        try {
          const transfer = await createTransfer(
            booking.dealer_payout_amount_cents,
            dealer.stripe_connect_account_id,
            {
              booking_id: bookingId,
              type: 'rental_payout',
            }
          )

          // Update booking with transfer ID
          await supabase
            .from('bookings')
            .update({
              stripe_transfer_id: transfer.id,
              payout_status: 'transferred',
            })
            .eq('id', bookingId)

          console.log(
            `Transfer ${transfer.id} created for booking ${bookingId}: ${booking.dealer_payout_amount_cents} cents to ${dealer.stripe_connect_account_id}`
          )
        } catch (transferError: any) {
          console.error('Failed to create transfer:', transferError)
          // Log error but don't fail the webhook - transfer can be retried
          await supabase
            .from('bookings')
            .update({
              payout_status: 'failed',
            })
            .eq('id', bookingId)
        }
      }

      console.log(`Booking ${bookingId} confirmed via Stripe webhook`)
    } catch (error: any) {
      console.error('Webhook handler error:', error)
      return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
  }

  // Handle transfer.created event (optional - for tracking transfer status)
  // Note: transfer.paid doesn't exist in Stripe API - transfers are paid per payout schedule
  if (event.type === 'transfer.created') {
    const transfer = event.data.object as Stripe.Transfer

    try {
      const supabase = createAdminClient()

      // Update booking if transfer ID matches
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payout_status: 'transferred',
        })
        .eq('stripe_transfer_id', transfer.id)

      if (updateError) {
        console.error('Failed to update booking with transfer status:', updateError)
      }
    } catch (error: any) {
      console.error('Transfer webhook handler error:', error)
    }
  }

  return NextResponse.json({ received: true })
}