/**
 * Get Renter Trust Profile
 * GET /api/dealer/renters/:renterId/trust-profile
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ renterId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { renterId } = await params

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, verification_status')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check permissions: Dealers and admins can view trust profiles
    const isDealer = profile.role === 'dealer' || profile.role === 'private_host'
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Dealers and admins only' }, { status: 403 })
    }

    // Get reviews for renter
    const { data: reviews } = await supabase
      .from('renter_reviews')
      .select('rating, tags')
      .eq('renter_id', renterId)

    // Calculate average rating
    const avgRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

    // Calculate tag summary
    const tagCounts: Record<string, number> = {}
    reviews?.forEach((review) => {
      if (review.tags && Array.isArray(review.tags)) {
        review.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })

    const tagsSummary = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    // Get complaint count
    const { count: complaintCount } = await supabase
      .from('dealer_complaints')
      .select('*', { count: 'exact', head: true })
      .eq('renter_id', renterId)
      .in('status', ['submitted', 'under_review', 'resolved'])

    // Determine advisory (none|watchlisted|restricted)
    // Simple logic: multiple complaints or low rating = watchlisted
    let advisory: 'none' | 'watchlisted' | 'restricted' = 'none'
    if (complaintCount && complaintCount > 2) {
      advisory = 'watchlisted'
    }
    if (avgRating < 2.5 && reviews && reviews.length > 3) {
      advisory = 'watchlisted'
    }
    // Restricted would be set manually by admin (future enhancement)

    // Check verification status
    const verifiedIdentity = profile.verification_status === 'approved'

    return NextResponse.json({
      success: true,
      trustProfile: {
        renterId,
        avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        reviewCount: reviews?.length || 0,
        tagsSummary,
        complaintCount: complaintCount || 0,
        advisory,
        verifiedIdentity,
      },
    })
  } catch (error: any) {
    console.error('Get trust profile error:', error)
    return NextResponse.json({ error: 'Failed to get trust profile' }, { status: 500 })
  }
}
