/**
 * Data Retention and Deletion Policies
 * Implements GDPR/CCPA compliant data retention and deletion
 */

import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from './auditLog'

export interface RetentionPolicy {
  resource_type: string
  retention_days: number
  auto_delete: boolean
}

// Data retention policies (in days)
export const RETENTION_POLICIES: RetentionPolicy[] = [
  { resource_type: 'audit_logs', retention_days: 2555, auto_delete: true }, // 7 years for compliance
  { resource_type: 'bookings', retention_days: 2555, auto_delete: false }, // 7 years for tax/legal
  { resource_type: 'payment_records', retention_days: 2555, auto_delete: false }, // 7 years for tax
  { resource_type: 'user_sessions', retention_days: 90, auto_delete: true }, // 90 days
  { resource_type: 'verification_documents', retention_days: 1095, auto_delete: false }, // 3 years
]

/**
 * Anonymize user data (GDPR right to be forgotten)
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  const supabase = await createClient()
  
  try {
    // Anonymize profile data
    await supabase
      .from('profiles')
      .update({
        full_name: 'Deleted User',
        phone: null,
        address: null,
        // Keep role and verification_status for platform integrity
      })
      .eq('user_id', userId)

    // Delete or anonymize documents
    // Note: Actual file deletion from storage should be handled separately
    
    // Log the anonymization
    await logAuditEvent({
      user_id: userId,
      action: 'data_anonymization',
      resource_type: 'user_profile',
      resource_id: userId,
      success: true,
    })
  } catch (error) {
    console.error('Error anonymizing user data:', error)
    throw error
  }
}

/**
 * Delete user account and associated data
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const supabase = await createClient()
  
  try {
    // First anonymize personal data
    await anonymizeUserData(userId)
    
    // Cancel any active bookings
    await supabase
      .from('bookings')
      .update({ status: 'canceled' })
      .eq('renter_id', userId)
      .in('status', ['draft', 'pending_payment', 'confirmed'])

    // Deactivate vehicle listings
    await supabase
      .from('vehicles')
      .update({ status: 'inactive' })
      .eq('dealer_id', userId)

    // Log the deletion
    await logAuditEvent({
      user_id: userId,
      action: 'account_deletion',
      resource_type: 'user_account',
      resource_id: userId,
      success: true,
    })
  } catch (error) {
    console.error('Error deleting user account:', error)
    throw error
  }
}

/**
 * Clean up expired data based on retention policies
 */
export async function cleanupExpiredData(): Promise<void> {
  const supabase = await createClient()
  
  for (const policy of RETENTION_POLICIES) {
    if (!policy.auto_delete) continue

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days)

    try {
      // This would need to be implemented per resource type
      // Example for audit logs:
      if (policy.resource_type === 'audit_logs') {
        const { error } = await supabase
          .from('audit_logs')
          .delete()
          .lt('created_at', cutoffDate.toISOString())

        if (error) {
          console.error(`Error cleaning up ${policy.resource_type}:`, error)
        }
      }
    } catch (error) {
      console.error(`Error in cleanup for ${policy.resource_type}:`, error)
    }
  }
}

/**
 * Export user data (GDPR data portability)
 */
export async function exportUserData(userId: string): Promise<Record<string, any>> {
  const supabase = await createClient()
  
  const data: Record<string, any> = {}

  try {
    // Export profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    data.profile = profile

    // Export bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('renter_id', userId)
    data.bookings = bookings

    // Export vehicles (if dealer)
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealer_id', userId)
    data.vehicles = vehicles

    // Log the export
    await logAuditEvent({
      user_id: userId,
      action: 'data_export',
      resource_type: 'user_data',
      resource_id: userId,
      success: true,
    })

    return data
  } catch (error) {
    console.error('Error exporting user data:', error)
    throw error
  }
}
