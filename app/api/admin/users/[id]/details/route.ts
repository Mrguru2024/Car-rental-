/**
 * Get Comprehensive User Details
 * Only accessible to Super Admin
 * 
 * GET /api/admin/users/:id/details
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/utils/roleHierarchy'

export async function GET(
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
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!requesterProfile || !isSuperAdmin(requesterProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    const adminSupabase = createAdminClient()

    // Get profile
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get auth user details
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(
      profile.user_id
    )

    if (authError) {
      console.error('Error fetching auth user:', authError)
    }

    // Get user bookings
    const { data: bookings } = await adminSupabase
      .from('bookings')
      .select('id, status, start_date, end_date, total_price, created_at, vehicles(id, make, model, year)')
      .or(`renter_id.eq.${profile.id},vehicles.dealer_id.eq.${profile.user_id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get vehicles (if dealer/host)
    const { data: vehicles } = await adminSupabase
      .from('vehicles')
      .select('id, make, model, year, status, created_at')
      .eq('dealer_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get disputes
    const { data: disputes } = await adminSupabase
      .from('disputes')
      .select('id, status, type, created_at, booking_id')
      .or(`renter_id.eq.${profile.id},dealer_id.eq.${profile.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get complaints
    const { data: complaints } = await adminSupabase
      .from('dealer_complaints')
      .select('id, status, complaint_type, created_at')
      .eq('complainer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get security events
    const { data: securityEvents } = await adminSupabase
      .from('security_events')
      .select('id, event_type, severity, created_at, resolved')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      data: {
        profile,
        auth: authUser?.user || null,
        bookings: bookings || [],
        vehicles: vehicles || [],
        disputes: disputes || [],
        complaints: complaints || [],
        securityEvents: securityEvents || [],
      },
    })
  } catch (error: any) {
    console.error('Admin user details error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}