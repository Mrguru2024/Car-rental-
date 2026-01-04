/**
 * Dealer→Renter Reviews
 * POST /api/dealer/renter-reviews - Create review
 * GET /api/dealer/renter-reviews?renter_id=... - Get reviews for renter
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/security/auditLog'
import { hasPolicyAcceptance } from '@/lib/policies/acceptance'

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

    if (!profile || (profile.role !== 'dealer' && profile.role !== 'private_host')) {
      return NextResponse.json({ error: 'Only dealers can create renter reviews' }, { status: 403 })
    }

    const body = await request.json()
    const { booking_id, renter_id, rating, tags, comment } = body

    if (!booking_id || !renter_id || !rating) {
      return NextResponse.json(
        { error: 'booking_id, renter_id, and rating are required' },
        { status: 400 }
      )
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Validate comment length (max 500 chars)
    if (comment && comment.length > 500) {
      return NextResponse.json({ error: 'Comment must be 500 characters or less' }, { status: 400 })
    }

    // Validate tags
    if (tags && !Array.isArray(tags)) {
      return NextResponse.json({ error: 'tags must be an array' }, { status: 400 })
    }

    // Verify booking belongs to dealer and is completed
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, vehicles(dealer_id)')
      .eq('id', booking_id)
      .eq('status', 'completed')
      .single()

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or not completed' },
        { status: 404 }
      )
    }

    const dealerId = (booking.vehicles as any).dealer_id
    if (dealerId !== profile.id) {
      return NextResponse.json({ error: 'Booking does not belong to dealer' }, { status: 403 })
    }

    // Check if review already exists for this booking
    const { data: existingReview } = await supabase
      .from('renter_reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this booking' },
        { status: 400 }
      )
    }

    // Check policy acceptance
    const hasAccepted = await hasPolicyAcceptance(
      profile.id,
      'review_honesty_policy',
      '1.0',
      'review',
      booking_id,
      profile.role
    )

    if (!hasAccepted) {
      return NextResponse.json(
        {
          error: 'Policy acceptance required',
          policy_key: 'review_honesty_policy',
          policy_version: '1.0',
        },
        { status: 403 }
      )
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Create review
    const adminSupabase = createAdminClient()
    const { data: review, error: reviewError } = await adminSupabase
      .from('renter_reviews')
      .insert({
        booking_id,
        dealer_id: profile.id,
        renter_id,
        rating,
        tags: tags || [],
        comment: comment?.trim() || null,
      })
      .select()
      .single()

    if (reviewError || !review) {
      console.error('Failed to create review:', reviewError)
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent({
      user_id: profile.id,
      actor_role: profile.role,
      action: 'RENTER_REVIEW_CREATED',
      resource_type: 'renter_review',
      resource_id: review.id,
      details: {
        booking_id,
        renter_id,
        rating,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        booking_id: review.booking_id,
        rating: review.rating,
        tags: review.tags,
        comment: review.comment,
        created_at: review.created_at,
      },
    })
  } catch (error: any) {
    console.error('Create renter review error:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
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
    const renterId = searchParams.get('renter_id')

    if (!renterId) {
      return NextResponse.json({ error: 'renter_id query parameter is required' }, { status: 400 })
    }

    // Check permissions: Dealers and admins can view all reviews, renters can view their own
    const isDealer = profile.role === 'dealer' || profile.role === 'private_host'
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)
    const isRenter = profile.role === 'renter' && renterId === profile.id

    if (!isDealer && !isAdmin && !isRenter) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get reviews for renter
    const { data: reviews, error } = await supabase
      .from('renter_reviews')
      .select('id, booking_id, rating, tags, comment, created_at')
      .eq('renter_id', renterId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get renter reviews error:', error)
      return NextResponse.json({ error: 'Failed to get reviews' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
    })
  } catch (error: any) {
    console.error('Get renter reviews error:', error)
    return NextResponse.json({ error: 'Failed to get reviews' }, { status: 500 })
  }
}
