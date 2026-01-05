/**
 * Troubleshooting Tools for Users
 * Only accessible to Super Admin
 * 
 * POST /api/admin/users/:id/troubleshoot
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/utils/roleHierarchy'
import { logAuditEvent } from '@/lib/security/auditLog'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get requester profile and role
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!requesterProfile || !isSuperAdmin(requesterProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, ...actionParams } = body

    const adminSupabase = createAdminClient()

    // Get profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('user_id, id')
      .eq('id', id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    let result: any = {}

    switch (action) {
      case 'fix_stuck_bookings':
        // Fix bookings stuck in pending_payment or confirmed status past end date
        const { data: stuckBookings } = await adminSupabase
          .from('bookings')
          .select('id, status, end_date')
          .or(`renter_id.eq.${profile.id},vehicles.dealer_id.eq.${profile.user_id}`)
          .in('status', ['pending_payment', 'confirmed'])
          .lt('end_date', new Date().toISOString())

        if (stuckBookings && stuckBookings.length > 0) {
          const bookingIds = stuckBookings.map((b) => b.id)
          const { error: updateError } = await adminSupabase
            .from('bookings')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .in('id', bookingIds)

          if (updateError) throw updateError

          result.fixed = bookingIds.length
          result.bookings = bookingIds
        } else {
          result.fixed = 0
        }
        break

      case 'sync_profile_verification':
        // Sync verification status if user is approved in auth but not in profile
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(profile.user_id)
        if (authUser?.user?.email_confirmed_at && profile.verification_status !== 'approved') {
          const { error: syncError } = await adminSupabase
            .from('profiles')
            .update({ verification_status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', id)

          if (syncError) throw syncError
          result.synced = true
        } else {
          result.synced = false
        }
        break

      case 'clear_stale_sessions':
        // This would require auth admin API - just log for now
        result.message = 'Session clearing requires direct database access'
        break

      case 'refresh_stripe_account':
        // Refresh Stripe Connect account status
        if (profile.stripe_connect_account_id) {
          try {
            const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id)
            const status = account.details_submitted && account.charges_enabled ? 'active' : 'pending'

            const { error: updateError } = await adminSupabase
              .from('profiles')
              .update({
                stripe_connect_account_status: status,
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)

            if (updateError) throw updateError
            result.status = status
            result.refreshed = true
          } catch (stripeError: any) {
            result.error = stripeError.message
            result.refreshed = false
          }
        } else {
          result.refreshed = false
          result.message = 'No Stripe Connect account found'
        }
        break

      case 'recalculate_ratings':
        // Recalculate user ratings from reviews
        const { data: reviews } = await adminSupabase
          .from('dealer_reviews')
          .select('rating')
          .eq('dealer_id', profile.id)

        if (reviews && reviews.length > 0) {
          const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)
          const averageRating = totalRating / reviews.length

          const { error: updateError } = await adminSupabase
            .from('profiles')
            .update({
              average_rating: Math.round(averageRating * 10) / 10,
              total_reviews: reviews.length,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)

          if (updateError) throw updateError
          result.averageRating = averageRating
          result.totalReviews = reviews.length
          result.recalculated = true
        } else {
          result.recalculated = false
          result.message = 'No reviews found'
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log audit event
    await logAuditEvent({
      user_id: requesterProfile.id,
      actor_role: requesterProfile.role || undefined,
      action: `admin_troubleshoot_${action}`,
      resource_type: 'profile',
      resource_id: id,
      notes: JSON.stringify(result),
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: `Troubleshooting action "${action}" completed`,
      data: result,
    })
  } catch (error: any) {
    console.error('Admin troubleshoot error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}