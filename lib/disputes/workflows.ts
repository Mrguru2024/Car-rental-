/**
 * Dispute Workflow Utilities
 * Business logic for dispute operations
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DisputeStatus } from './transitions'

/**
 * Check if booking is eligible for dispute
 */
export async function isBookingEligibleForDispute(bookingId: string, renterId: string): Promise<{
  eligible: boolean
  reason?: string
}> {
  const supabase = await createClient()

  // Get booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, renter_id, status, start_date, end_date')
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    return { eligible: false, reason: 'Booking not found' }
  }

  // Check if booking belongs to renter
  if (booking.renter_id !== renterId) {
    return { eligible: false, reason: 'Booking does not belong to renter' }
  }

  // Check if booking status allows disputes
  // Allow disputes for: confirmed, completed, canceled (if canceled after start)
  const allowedStatuses = ['confirmed', 'completed']
  
  // For canceled bookings, check if canceled after start date
  if (booking.status === 'canceled') {
    const startDate = new Date(booking.start_date)
    const now = new Date()
    if (now >= startDate) {
      // Canceled after start - allow dispute
      return { eligible: true }
    } else {
      return { eligible: false, reason: 'Cannot dispute bookings canceled before start date' }
    }
  }

  if (!allowedStatuses.includes(booking.status)) {
    return {
      eligible: false,
      reason: `Cannot dispute bookings with status: ${booking.status}`,
    }
  }

  return { eligible: true }
}

/**
 * Auto-transition dispute status based on dealer response window
 * Lazy evaluation: check on access if dealer hasn't responded in 48 hours
 */
export async function checkDealerResponseWindow(disputeId: string): Promise<void> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // Get dispute
  const { data: dispute } = await adminSupabase
    .from('disputes')
    .select('id, status, created_at, booking_id')
    .eq('id', disputeId)
    .single()

  if (!dispute || dispute.status === 'closed' || dispute.status === 'under_review') {
    return // Already closed or under review
  }

  // Check if 48 hours have passed
  const createdAt = new Date(dispute.created_at)
  const now = new Date()
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceCreation < 48) {
    return // Not yet 48 hours
  }

  // Check if dealer has responded (any message from dealer)
  const { data: dealerMessages } = await adminSupabase
    .from('dispute_messages')
    .select('id')
    .eq('dispute_id', disputeId)
    .in('sender_role', ['dealer', 'private_host'])
    .limit(1)

  // If no dealer response and status is open/awaiting_response, transition to under_review
  if (!dealerMessages || dealerMessages.length === 0) {
    if (dispute.status === 'open' || dispute.status === 'awaiting_response') {
      await adminSupabase
        .from('disputes')
        .update({ status: 'under_review' })
        .eq('id', disputeId)

      // Log audit event
      const { logAuditEvent } = await import('@/lib/security/auditLog')
      await logAuditEvent({
        action: 'DISPUTE_AUTO_TRANSITION',
        resource_type: 'dispute',
        resource_id: disputeId,
        details: {
          from_status: dispute.status,
          to_status: 'under_review',
          reason: 'dealer_response_window_expired',
        },
        success: true,
      })
    }
  }
}

/**
 * Get dealer ID for a booking
 */
export async function getDealerIdForBooking(bookingId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('vehicles(dealer_id)')
    .eq('id', bookingId)
    .single()

  if (!booking || !(booking as any).vehicles) {
    return null
  }

  return (booking as any).vehicles.dealer_id
}
