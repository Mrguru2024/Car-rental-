/**
 * Booking Fraud Guardrails
 * Server-side checks before allowing bookings
 */

import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, recordRateLimitAttempt } from './rateLimit'

export interface BookingGuardResult {
  allowed: boolean
  reason?: string
  errorCode?: string
}

/**
 * Check if a booking attempt is allowed
 */
export async function guardBookingAttempt(
  renterId: string,
  vehicleId: string,
  ipAddress?: string
): Promise<BookingGuardResult> {
  const supabase = await createClient()

  // Note: Verification status is now checked in the API route before calling this function
  // This function focuses on rate limiting and vehicle availability

  // Check 1: Rate limiting
  const identifier = renterId // Use user_id for rate limiting
  const rateLimitCheck = await checkRateLimit(identifier, 'booking_attempt')

  if (!rateLimitCheck.allowed) {
    return {
      allowed: false,
      reason: 'Too many booking attempts. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    }
  }

  // Check 2: Vehicle availability
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('status, dealer_id')
    .eq('id', vehicleId)
    .single()

  if (vehicle?.status !== 'active') {
    return {
      allowed: false,
      reason: 'Vehicle is not available',
      errorCode: 'VEHICLE_UNAVAILABLE',
    }
  }

  // All checks passed - record the attempt
  await recordRateLimitAttempt(identifier, 'booking_attempt')

  return {
    allowed: true,
  }
}

/**
 * Add Stripe Radar metadata for fraud detection
 */
export function getStripeRadarMetadata(userId: string, vehicleId: string, bookingId: string) {
  return {
    userId,
    vehicleId,
    bookingId,
    platform: 'car-rental',
    // Add any other metadata for Stripe Radar
  }
}
