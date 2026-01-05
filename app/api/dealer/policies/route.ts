/**
 * Dealer Rental Policies API
 * GET - Get dealer's rental policies
 * POST - Create or update dealer's rental policies
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { validateDealerPolicy } from '@/lib/vehicle-tiers'

export async function GET(request: NextRequest) {
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

    const isDealer = profile.role === 'dealer' || profile.role === 'private_host'
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Dealers only' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Get policy for dealer (or all if admin)
    let query = adminSupabase.from('dealer_rental_policies').select('*')

    if (!isAdmin) {
      query = query.eq('dealer_id', profile.id)
    }

    const { data: policies, error } = await query

    if (error) {
      throw error
    }

    // If no policy exists, return default
    if (!policies || policies.length === 0) {
      return NextResponse.json({
        policy: {
          dealer_id: profile.id,
          min_vehicle_year: 2010,
          allowed_vehicle_tiers: ['tier1', 'tier2', 'tier3', 'tier4'],
          require_manual_approval: true,
          min_renter_standing_grade: 'C',
          block_flagged_renters: true,
          require_mvr_for_tier3: true,
          require_mvr_for_tier4: true,
          require_soft_credit_for_tier3: false,
          require_soft_credit_for_tier4: true,
        },
      })
    }

    return NextResponse.json({ policy: policies[0] })
  } catch (error: any) {
    console.error('Error fetching dealer policies:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const isDealer = profile.role === 'dealer' || profile.role === 'private_host'
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Dealers only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      min_vehicle_year,
      allowed_vehicle_tiers,
      require_manual_approval,
      min_renter_standing_grade,
      block_flagged_renters,
      require_mvr_for_tier3,
      require_mvr_for_tier4,
      require_soft_credit_for_tier3,
      require_soft_credit_for_tier4,
    } = body

    // Validate policy (ensure it doesn't weaken platform rules)
    const validation = validateDealerPolicy({
      min_vehicle_year: Number(min_vehicle_year) || 2010,
      allowed_vehicle_tiers: allowed_vehicle_tiers || ['tier1', 'tier2', 'tier3', 'tier4'],
    })

    if (!validation.ok) {
      return NextResponse.json(
        { error: 'Invalid policy', errors: validation.errors },
        { status: 400 }
      )
    }

    // Clamp values to ensure they don't violate platform rules
    const clampedMinYear = Math.max(2010, Number(min_vehicle_year) || 2010)
    const validTiers = ['tier1', 'tier2', 'tier3', 'tier4']
    const clampedTiers = (allowed_vehicle_tiers || validTiers).filter((tier: string) =>
      validTiers.includes(tier)
    )

    const adminSupabase = createAdminClient()

    // Upsert policy
    const { data: policy, error } = await adminSupabase
      .from('dealer_rental_policies')
      .upsert(
        {
          dealer_id: profile.id,
          min_vehicle_year: clampedMinYear,
          allowed_vehicle_tiers: clampedTiers,
          require_manual_approval: require_manual_approval !== undefined ? require_manual_approval : true,
          min_renter_standing_grade: min_renter_standing_grade || 'C',
          block_flagged_renters: block_flagged_renters !== undefined ? block_flagged_renters : true,
          require_mvr_for_tier3: require_mvr_for_tier3 !== undefined ? require_mvr_for_tier3 : true,
          require_mvr_for_tier4: require_mvr_for_tier4 !== undefined ? require_mvr_for_tier4 : true,
          require_soft_credit_for_tier3: require_soft_credit_for_tier3 !== undefined ? require_soft_credit_for_tier3 : false,
          require_soft_credit_for_tier4: require_soft_credit_for_tier4 !== undefined ? require_soft_credit_for_tier4 : true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'dealer_id',
        }
      )
      .select()
      .single()

    if (error || !policy) {
      throw error || new Error('Failed to save policy')
    }

    return NextResponse.json({ policy })
  } catch (error: any) {
    console.error('Error saving dealer policies:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
