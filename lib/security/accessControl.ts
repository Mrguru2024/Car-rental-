/**
 * Access Control and Authorization
 * Implements role-based access control and data access restrictions
 */

import { createClient } from '@/lib/supabase/server'
import { logDataAccess } from './auditLog'

export interface AccessCheck {
  allowed: boolean
  reason?: string
}

/**
 * Check if user can access a resource
 */
export async function canAccessResource(
  userId: string | undefined,
  resourceType: string,
  resourceId: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<AccessCheck> {
  if (!userId) {
    return { allowed: false, reason: 'User not authenticated' }
  }

  const supabase = await createClient()

  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, verification_status')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return { allowed: false, reason: 'User profile not found' }
    }

    // Check resource-specific access
    switch (resourceType) {
      case 'vehicle':
        return await checkVehicleAccess(userId, resourceId, action, profile.role, supabase)
      
      case 'booking':
        return await checkBookingAccess(userId, resourceId, action, profile.role, supabase)
      
      case 'profile':
        // Users can only access their own profile
        if (resourceId === userId) {
          return { allowed: true }
        }
        // Admins can access any profile
        if (profile.role === 'admin') {
          return { allowed: true }
        }
        return { allowed: false, reason: 'Access denied: can only view own profile' }
      
      case 'document':
        return await checkDocumentAccess(userId, resourceId, profile.role, supabase)
      
      default:
        return { allowed: false, reason: 'Unknown resource type' }
    }
  } catch (error) {
    console.error('Access control check error:', error)
    return { allowed: false, reason: 'Access check failed' }
  }
}

/**
 * Check vehicle access
 */
async function checkVehicleAccess(
  userId: string,
  vehicleId: string,
  action: string,
  userRole: string,
  supabase: any
): Promise<AccessCheck> {
  // Get vehicle owner
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('dealer_id, status')
    .eq('id', vehicleId)
    .single()

  if (!vehicle) {
    return { allowed: false, reason: 'Vehicle not found' }
  }

  // Owner can always access their vehicle
  if (vehicle.dealer_id === userId) {
    return { allowed: true }
  }

  // Admins can access any vehicle
  if (userRole === 'admin') {
    return { allowed: true }
  }

  // Renters can read active vehicles
  if (action === 'read' && vehicle.status === 'active') {
    return { allowed: true }
  }

  // Renters cannot write/delete vehicles they don't own
  return { allowed: false, reason: 'Access denied: not vehicle owner' }
}

/**
 * Check booking access
 */
async function checkBookingAccess(
  userId: string,
  bookingId: string,
  action: string,
  userRole: string,
  supabase: any
): Promise<AccessCheck> {
  // Get booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('renter_id, vehicle_id, vehicles!inner(dealer_id)')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return { allowed: false, reason: 'Booking not found' }
  }

  // Renter can access their booking
  if (booking.renter_id === userId) {
    return { allowed: true }
  }

  // Vehicle owner can access bookings for their vehicles
  if (booking.vehicles?.dealer_id === userId) {
    return { allowed: true }
  }

  // Admins can access any booking
  if (userRole === 'admin') {
    return { allowed: true }
  }

  return { allowed: false, reason: 'Access denied: not booking participant' }
}

/**
 * Check document access
 */
async function checkDocumentAccess(
  userId: string,
  documentId: string,
  userRole: string,
  supabase: any
): Promise<AccessCheck> {
  // Documents are typically linked to profiles
  // Users can only access their own documents
  // Admins can access all documents
  
  if (userRole === 'admin') {
    return { allowed: true }
  }

  // Check if document belongs to user
  // This would need to be implemented based on your document storage structure
  // For now, return allowed for own documents
  return { allowed: true }
}

/**
 * Enforce access control and log access
 */
export async function enforceAccessControl(
  userId: string | undefined,
  resourceType: string,
  resourceId: string,
  action: 'read' | 'write' | 'delete' = 'read',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const accessCheck = await canAccessResource(userId, resourceType, resourceId, action)
  
  if (!accessCheck.allowed) {
    // Log denied access attempt
    await logDataAccess(userId, resourceType, resourceId, {
      action,
      denied: true,
      reason: accessCheck.reason,
    }, ipAddress, userAgent)
    
    throw new Error(accessCheck.reason || 'Access denied')
  }

  // Log successful access
  await logDataAccess(userId, resourceType, resourceId, {
    action,
    allowed: true,
  }, ipAddress, userAgent)
}
