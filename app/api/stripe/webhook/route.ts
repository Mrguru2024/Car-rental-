import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
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

      console.log(`Booking ${bookingId} confirmed via Stripe webhook`)
    } catch (error: any) {
      console.error('Webhook handler error:', error)
      return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}