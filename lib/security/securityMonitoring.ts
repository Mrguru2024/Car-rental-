/**
 * Security Monitoring and Threat Detection
 * Monitors for suspicious activity and security threats
 */

import { createClient } from '@/lib/supabase/server'

export interface SecurityEvent {
  user_id?: string
  event_type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, any>
}

/**
 * Log a security event
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.rpc('log_security_event', {
      p_user_id: event.user_id || null,
      p_event_type: event.event_type,
      p_severity: event.severity,
      p_description: event.description,
      p_ip_address: event.ip_address || null,
      p_user_agent: event.user_agent || null,
      p_metadata: event.metadata || {},
    })

    if (error) {
      console.error('Failed to log security event:', error)
    }

    // For critical events, could trigger alerts/notifications here
    if (event.severity === 'critical') {
      console.error('CRITICAL SECURITY EVENT:', event)
      // TODO: Send alert to security team
    }
  } catch (error) {
    console.error('Security event logging error:', error)
  }
}

/**
 * Check for suspicious login patterns
 */
export async function checkSuspiciousLogin(
  userId: string | undefined,
  ipAddress: string,
  success: boolean
): Promise<void> {
  if (!userId || success) return

  const supabase = await createClient()

  // Check for multiple failed logins from same IP
  const { data: recentFailures } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('action', 'login_failed')
    .eq('ip_address', ipAddress)
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
    .limit(5)

  if (recentFailures && recentFailures.length >= 5) {
    await logSecurityEvent({
      user_id: userId,
      event_type: 'suspicious_activity',
      severity: 'high',
      description: 'Multiple failed login attempts detected',
      ip_address: ipAddress,
      metadata: { failed_attempts: recentFailures.length },
    })
  }
}

/**
 * Monitor for unauthorized access attempts
 */
export async function monitorUnauthorizedAccess(
  userId: string | undefined,
  resourceType: string,
  resourceId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    user_id: userId,
    event_type: 'unauthorized_access',
    severity: 'medium',
    description: `Unauthorized access attempt to ${resourceType}:${resourceId}`,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: { resource_type: resourceType, resource_id: resourceId },
  })
}

/**
 * Check for data breach patterns
 */
export async function checkDataBreachPatterns(
  userId: string | undefined,
  action: string,
  ipAddress?: string
): Promise<void> {
  const supabase = await createClient()

  // Check for bulk data access
  const { data: recentAccess } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('action', 'data_access')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
    .limit(100)

  if (recentAccess && recentAccess.length >= 100) {
    await logSecurityEvent({
      user_id: userId,
      event_type: 'data_breach_attempt',
      severity: 'critical',
      description: 'Suspicious bulk data access pattern detected',
      ip_address: ipAddress,
      metadata: { access_count: recentAccess.length },
    })
  }
}
