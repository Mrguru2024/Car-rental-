/**
 * Audit Logging System
 * Tracks all sensitive data access and modifications for compliance and security
 */

import { createClient } from '@/lib/supabase/server'

export interface AuditLogEntry {
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Get user IP and user agent from request context if available
    const ip_address = entry.ip_address || 'unknown'
    const user_agent = entry.user_agent || 'unknown'
    
    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.user_id || null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id || null,
      details: entry.details || {},
      ip_address,
      user_agent,
      success: entry.success,
      error_message: entry.error_message || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging failures shouldn't break the app
    }
  } catch (error) {
    console.error('Audit logging error:', error)
    // Silently fail - audit logging should not break application flow
  }
}

/**
 * Log data access
 */
export async function logDataAccess(
  user_id: string | undefined,
  resource_type: string,
  resource_id: string,
  details?: Record<string, any>,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAuditEvent({
    user_id,
    action: 'data_access',
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent,
    success: true,
  })
}

/**
 * Log data modification
 */
export async function logDataModification(
  user_id: string | undefined,
  resource_type: string,
  resource_id: string,
  changes: Record<string, any>,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAuditEvent({
    user_id,
    action: 'data_modification',
    resource_type,
    resource_id,
    details: { changes },
    ip_address,
    user_agent,
    success: true,
  })
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  user_id: string | undefined,
  action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'account_locked',
  success: boolean,
  error_message?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAuditEvent({
    user_id,
    action,
    resource_type: 'authentication',
    success,
    error_message,
    ip_address,
    user_agent,
  })
}

/**
 * Log payment events
 */
export async function logPaymentEvent(
  user_id: string | undefined,
  action: 'payment_initiated' | 'payment_completed' | 'payment_failed' | 'refund_issued',
  resource_id: string,
  amount?: number,
  currency?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAuditEvent({
    user_id,
    action,
    resource_type: 'payment',
    resource_id,
    details: { amount, currency },
    ip_address,
    user_agent,
    success: action === 'payment_completed' || action === 'refund_issued',
  })
}
