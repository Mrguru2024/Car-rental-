import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect'

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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, stripe_connect_account_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only dealers and hosts can create Connect accounts
    if (profile.role !== 'dealer' && profile.role !== 'private_host') {
      return NextResponse.json(
        { error: 'Only dealers and hosts can create Connect accounts' },
        { status: 403 }
      )
    }

    // Check if account already exists
    if (profile.stripe_connect_account_id) {
      // Get account link for existing account
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const accountLink = await createAccountLink(
        profile.stripe_connect_account_id,
        `${appUrl}/dealer?onboarding=complete`,
        `${appUrl}/dealer?onboarding=refresh`
      )

      return NextResponse.json({ url: accountLink.url })
    }

    // Get user email from auth
    const { data: authUser } = await supabase.auth.getUser()
    if (!authUser.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Create new Connect account
    const account = await createConnectAccount(authUser.user.email, {
      profile_id: profile.id,
      user_id: user.id,
    })

    // Create account link for onboarding
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await createAccountLink(
      account.id,
      `${appUrl}/dealer?onboarding=complete`,
      `${appUrl}/dealer?onboarding=refresh`
    )

    // Save Connect account ID to profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_account_status: 'pending',
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Failed to update profile with Connect account:', updateError)
      return NextResponse.json({ error: 'Failed to save Connect account' }, { status: 500 })
    }

    return NextResponse.json({ url: accountLink.url, accountId: account.id })
  } catch (error: any) {
    console.error('Stripe Connect onboarding error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}