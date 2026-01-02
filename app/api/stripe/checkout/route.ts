import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { calculatePayoutAmounts } from '@/lib/stripe/payouts'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
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

    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    // Fetch booking with vehicle
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, vehicles(price_per_day, dealer_id)')
      .eq('id', bookingId)
      .eq('renter_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const vehicle = booking.vehicles as { price_per_day: number; dealer_id: string }

    // Fetch dealer profile with Connect account info
    const { data: dealer, error: dealerError } = await supabase
      .from('profiles')
      .select('id, stripe_connect_account_id, stripe_connect_account_status')
      .eq('id', vehicle.dealer_id)
      .single()

    if (dealerError || !dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    // Verify dealer has active Connect account
    if (!dealer.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'Dealer has not set up payment account. Please contact support.' },
        { status: 400 }
      )
    }

    if (dealer.stripe_connect_account_status !== 'active') {
      return NextResponse.json(
        { error: 'Dealer payment account is not active. Please contact support.' },
        { status: 400 }
      )
    }

    if (booking.status !== 'draft' && booking.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 })
    }

    // Fetch insurance election
    const { data: election, error: electionError } = await supabase
      .from('booking_insurance_elections')
      .select('*, byoi_documents(*)')
      .eq('booking_id', bookingId)
      .single()

    if (electionError || !election) {
      return NextResponse.json(
        { error: 'Insurance election required. Please select a protection plan.' },
        { status: 400 }
      )
    }

    // For BYOI, verify approval and liability acceptance
    if (election.coverage_type === 'byoi') {
      if (election.byoi_documents?.status !== 'approved') {
        return NextResponse.json(
          { error: 'BYOI insurance document must be approved before checkout' },
          { status: 400 }
        )
      }

      const { data: acceptance } = await supabase
        .from('liability_acceptances')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (!acceptance) {
        return NextResponse.json(
          { error: 'Liability acceptance required for BYOI coverage' },
          { status: 400 }
        )
      }
    }

    // Calculate line items
    const startDate = new Date(booking.start_date)
    const endDate = new Date(booking.end_date)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const vehiclePricePerDay = vehicle.price_per_day / 100 // Convert cents to dollars
    const rentalBaseCents = Math.round(diffDays * vehiclePricePerDay * 100)
    const planFeeCents = booking.plan_fee_cents || 0

    // Calculate payout amounts (platform fee and dealer payout)
    const { platformFeeCents, dealerPayoutCents } = calculatePayoutAmounts(rentalBaseCents, 0.1)

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Vehicle Rental - ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
          },
          unit_amount: rentalBaseCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Platform Fee (10%)',
          },
          unit_amount: platformFeeCents,
        },
        quantity: 1,
      },
    ]

    // Add plan fee if platform plan
    if (planFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Protection Plan Fee',
          },
          unit_amount: planFeeCents,
        },
        quantity: 1,
      })
    }

    // Get app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/bookings/${bookingId}/success`,
      cancel_url: `${appUrl}/checkout/${bookingId}/review`,
      metadata: {
        bookingId: booking.id,
      },
    })

    // Update booking with payout information
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'pending_payment',
        stripe_checkout_session_id: session.id,
        platform_fee_cents: platformFeeCents,
        dealer_payout_amount_cents: dealerPayoutCents,
        payout_status: 'pending',
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Failed to update booking:', updateError)
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}