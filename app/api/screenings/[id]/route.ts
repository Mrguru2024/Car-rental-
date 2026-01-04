/**
 * Get Screening Status
 * GET /api/screenings/:id
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { id } = await params

    // Get screening record
    const { data: screening, error } = await supabase
      .from('renter_screenings')
      .select('id, renter_id, booking_id, screening_type, status, result, risk_level, signals, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check permissions:
    // - Renter can view their own screenings
    // - Dealers can view screenings for bookings on their vehicles
    // - Admins can view all
    const isRenter = profile.role === 'renter' && screening.renter_id === profile.id
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    let isDealer = false
    if (screening.booking_id && (profile.role === 'dealer' || profile.role === 'private_host')) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('vehicles(dealer_id)')
        .eq('id', screening.booking_id)
        .single()

      if (booking && (booking as any).vehicles) {
        isDealer = (booking as any).vehicles.dealer_id === profile.id
      }
    }

    if (!isRenter && !isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return summary (not full signals/details for dealers)
    return NextResponse.json({
      success: true,
      screening: {
        id: screening.id,
        screening_type: screening.screening_type,
        status: screening.status,
        result: screening.result,
        risk_level: screening.risk_level,
        // Only include signals for renter and admin
        signals: isRenter || isAdmin ? screening.signals : {},
        created_at: screening.created_at,
        updated_at: screening.updated_at,
      },
    })
  } catch (error: any) {
    console.error('Get screening error:', error)
    return NextResponse.json({ error: 'Failed to get screening' }, { status: 500 })
  }
}
