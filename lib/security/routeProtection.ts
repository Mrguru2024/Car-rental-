/**
 * Route Protection Utilities
 * Server-side route protection helpers
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface RouteProtectionOptions {
  requireAuth?: boolean
  requireRole?: 'admin' | 'dealer' | 'renter' | 'private_host'
  requireRoles?: Array<'admin' | 'dealer' | 'renter' | 'private_host'>
  redirectTo?: string
}

/**
 * Protect a route with authentication and/or role checks
 */
export async function protectRoute(options: RouteProtectionOptions = {}) {
  const {
    requireAuth = true,
    requireRole,
    requireRoles,
    redirectTo = '/auth',
  } = options

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check authentication
  if (requireAuth && !user) {
    redirect(redirectTo)
  }

  // If no role requirements, return user
  if (!requireRole && !requireRoles) {
    return { user, profile: null }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, verification_status')
    .eq('user_id', user?.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  // Check single role requirement
  if (requireRole && profile.role !== requireRole) {
    redirect('/onboarding')
  }

  // Check multiple role requirements
  if (requireRoles && !requireRoles.includes(profile.role as any)) {
    redirect('/onboarding')
  }

  return { user, profile }
}

/**
 * Protect admin routes
 */
export async function protectAdminRoute() {
  return protectRoute({
    requireAuth: true,
    requireRole: 'admin',
    redirectTo: '/',
  })
}

/**
 * Protect dealer routes
 */
export async function protectDealerRoute() {
  return protectRoute({
    requireAuth: true,
    requireRoles: ['dealer', 'private_host'],
    redirectTo: '/onboarding',
  })
}

/**
 * Protect renter routes
 */
export async function protectRenterRoute() {
  return protectRoute({
    requireAuth: true,
    requireRole: 'renter',
    redirectTo: '/onboarding',
  })
}

/**
 * Check if user can access a booking
 */
export async function canAccessBooking(bookingId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()

  // Get booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('renter_id, vehicle_id, vehicles!inner(dealer_id)')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return false
  }

  // Check if user is renter or vehicle owner
  if (booking.renter_id === userId || booking.vehicles?.dealer_id === userId) {
    return true
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  return profile?.role === 'admin'
}
