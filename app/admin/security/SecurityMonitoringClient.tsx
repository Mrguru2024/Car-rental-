'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import { formatDate, formatDateLong } from '@/lib/utils/format'

interface SecurityEvent {
  id: string
  user_id: string | null
  event_type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any>
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

interface AuditLog {
  id: string
  user_id: string | null
  actor_role: string | null
  action: string
  resource_type: string
  resource_id: string | null
  previous_state: Record<string, any> | null
  new_state: Record<string, any> | null
  details: Record<string, any>
  notes: string | null
  ip_address: string | null
  user_agent: string | null
  success: boolean
  error_message: string | null
  created_at: string
}

interface SecurityStats {
  totalEvents: number
  unresolvedEvents: number
  criticalEvents: number
  highSeverityEvents: number
  failedLogins: number
}

interface Dispute {
  id: string
  booking_id: string
  opened_by: string
  opened_by_role: string
  category: string
  status: string
  summary: string
  created_at: string
  updated_at: string
  bookings: {
    id: string
    start_date: string
    end_date: string
    status: string
    vehicles: {
      id: string
      make: string
      model: string
      year: number
    }
    profiles: {
      id: string
      full_name: string | null
    }
  }
  profiles: {
    id: string
    full_name: string | null
    role: string
  }
}

interface DisputeWorkflowData {
  messages: Array<{
    id: string
    dispute_id: string
    sender_id: string
    sender_role: string
    message: string
    created_at: string
    profiles: {
      id: string
      full_name: string | null
      role: string
    }
  }>
  evidence: Array<{
    id: string
    dispute_id: string
    uploaded_by: string
    uploaded_by_role: string
    file_path: string
    file_type: string
    created_at: string
    profiles: {
      id: string
      full_name: string | null
      role: string
    }
  }>
  decisions: Array<{
    id: string
    dispute_id: string
    decided_by: string
    decided_by_role: string
    decision: string
    notes: string
    created_at: string
    profiles: {
      id: string
      full_name: string | null
      role: string
    }
  }>
}

interface SecurityMonitoringClientProps {
  initialSecurityEvents: SecurityEvent[]
  initialAuditLogs: AuditLog[]
  isSuperAdmin?: boolean
  stats: SecurityStats
}

export default function SecurityMonitoringClient({
  initialSecurityEvents,
  initialAuditLogs,
  isSuperAdmin = false,
  stats: initialStats,
}: SecurityMonitoringClientProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(initialSecurityEvents)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [disputeWorkflowData, setDisputeWorkflowData] = useState<Record<string, DisputeWorkflowData>>({})
  const [stats, setStats] = useState<SecurityStats>(initialStats)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'events' | 'audit' | 'activity' | 'disputes'>('events')
  const [disputeFilters, setDisputeFilters] = useState({
    status: 'all' as 'all' | 'open' | 'awaiting_response' | 'under_review' | 'resolved' | 'escalated' | 'closed',
    category: 'all' as 'all' | 'vehicle_damage' | 'late_return' | 'cleaning_fee' | 'mechanical_issue' | 'safety_concern' | 'billing_issue' | 'other',
  })
  const [filters, setFilters] = useState({
    severity: 'all' as 'all' | 'critical' | 'high' | 'medium' | 'low',
    eventType: 'all' as 'all' | SecurityEvent['event_type'],
    resolved: 'unresolved' as 'all' | 'resolved' | 'unresolved',
    dateRange: '24h' as '1h' | '24h' | '7d' | '30d' | 'all',
  })

  // Real-time polling (optimized - only fetch when tab is active or filters change)
  const fetchData = useCallback(async () => {
    try {
      const dateFilter = getDateFilter(filters.dateRange)

      // Only fetch data for active tab to reduce queries
      const shouldFetchEvents = activeTab === 'events' || activeTab === 'activity'
      const shouldFetchAudit = activeTab === 'audit' || activeTab === 'activity'
      const shouldFetchDisputes = activeTab === 'disputes' && isSuperAdmin

      const promises: Promise<any>[] = []

      // Fetch security events (only if needed)
      if (shouldFetchEvents) {
        let eventsQuery = supabase
          .from('security_events')
          .select('*')
          .order('severity', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })

        if (filters.resolved === 'resolved') {
          eventsQuery = eventsQuery.eq('resolved', true)
        } else if (filters.resolved === 'unresolved') {
          eventsQuery = eventsQuery.eq('resolved', false)
        }

        if (filters.severity !== 'all') {
          eventsQuery = eventsQuery.eq('severity', filters.severity)
        }

        if (filters.eventType !== 'all') {
          eventsQuery = eventsQuery.eq('event_type', filters.eventType)
        }

        if (dateFilter) {
          eventsQuery = eventsQuery.gte('created_at', dateFilter.toISOString())
        }

        promises.push(Promise.resolve(eventsQuery.limit(100)).then(({ data }) => ({ type: 'events', data: data || [] })))
      }

      // Fetch audit logs (only if needed)
      if (shouldFetchAudit) {
        let auditQuery = supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })

        if (dateFilter) {
          auditQuery = auditQuery.gte('created_at', dateFilter.toISOString())
        }

        promises.push(Promise.resolve(auditQuery.limit(100)).then(({ data }) => ({ type: 'audit', data: data || [] })))
      }

      // Always fetch stats (lightweight)
      promises.push(
        Promise.all([
          supabase.from('security_events').select('*', { count: 'exact', head: true }),
          supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('resolved', false),
          supabase
            .from('security_events')
            .select('*', { count: 'exact', head: true })
            .eq('resolved', false)
            .eq('severity', 'critical'),
          supabase
            .from('security_events')
            .select('*', { count: 'exact', head: true })
            .eq('resolved', false)
            .eq('severity', 'high'),
          supabase
            .from('security_events')
            .select('*', { count: 'exact', head: true })
            .eq('resolved', false)
            .eq('event_type', 'failed_login'),
        ]).then((results) => ({
          type: 'stats',
          data: {
            totalEvents: results[0].count || 0,
            unresolvedEvents: results[1].count || 0,
            criticalEvents: results[2].count || 0,
            highSeverityEvents: results[3].count || 0,
            failedLogins: results[4].count || 0,
          },
        }))
      )

      // Fetch disputes (super admin only)
      if (shouldFetchDisputes) {
        const statusParam = disputeFilters.status !== 'all' ? disputeFilters.status : undefined
        const categoryParam = disputeFilters.category !== 'all' ? disputeFilters.category : undefined
        
        const params = new URLSearchParams()
        if (statusParam) params.set('status', statusParam)
        if (categoryParam) params.set('category', categoryParam)
        
        promises.push(
          fetch(`/api/admin/disputes/monitoring?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => ({
              type: 'disputes',
              data: data.disputes || [],
              workflowData: data.workflowData || {},
            }))
        )
      }

      const results = await Promise.all(promises)

      results.forEach((result) => {
        if (result.type === 'events') {
          setSecurityEvents(result.data)
        } else if (result.type === 'audit') {
          setAuditLogs(result.data)
        } else if (result.type === 'stats') {
          setStats(result.data)
        } else if (result.type === 'disputes') {
          setDisputes(result.data)
          setDisputeWorkflowData(result.workflowData)
        }
      })
    } catch (error) {
      console.error('Error fetching security data:', error)
    }
  }, [filters, disputeFilters, activeTab, isSuperAdmin, supabase])

  useEffect(() => {
    fetchData()
    // Increase polling interval to 15 seconds to reduce server load
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleResolveEvent = async (eventId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/security/events/${eventId}/resolve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to resolve event')
      }

      showToast('Security event resolved successfully', 'success')
      fetchData() // Refresh data
    } catch (error: any) {
      showToast(error.message || 'Failed to resolve event', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
    }
  }

  const getEventTypeLabel = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const filteredEvents = securityEvents.filter((event) => {
    if (filters.severity !== 'all' && event.severity !== filters.severity) return false
    if (filters.eventType !== 'all' && event.event_type !== filters.eventType) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50">
          <h3 className="text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-1">Total Events</h3>
          <p className="text-2xl font-bold text-brand-navy dark:text-brand-white">{stats.totalEvents}</p>
        </div>
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50">
          <h3 className="text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-1">Unresolved</h3>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.unresolvedEvents}</p>
        </div>
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-red-200 dark:border-red-800/50">
          <h3 className="text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-1">Critical</h3>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.criticalEvents}</p>
        </div>
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-orange-200 dark:border-orange-800/50">
          <h3 className="text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-1">High Severity</h3>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.highSeverityEvents}</p>
        </div>
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50">
          <h3 className="text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-1">Failed Logins</h3>
          <p className="text-2xl font-bold text-brand-navy dark:text-brand-white">{stats.failedLogins}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-brand-gray/20 dark:border-brand-navy/50">
        <nav className="flex space-x-8">
          {[
            { id: 'events', label: 'Security Events', count: filteredEvents.length },
            { id: 'audit', label: 'Audit Logs', count: auditLogs.length },
            { id: 'activity', label: 'User Activity', count: auditLogs.filter((log) => log.action.includes('login') || log.action.includes('logout')).length },
            ...(isSuperAdmin
              ? [{ id: 'disputes', label: 'Dispute Workflow', count: disputes.length }]
              : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-blue dark:border-brand-blue-light text-brand-blue dark:text-brand-blue-light'
                  : 'border-transparent text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white hover:border-brand-gray/30'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 py-0.5 px-2 rounded-full bg-brand-gray/20 dark:bg-brand-navy/50 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      {activeTab !== 'disputes' && (
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-2">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-2">
              Event Type
            </label>
            <select
              value={filters.eventType}
              onChange={(e) => setFilters({ ...filters, eventType: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
            >
              <option value="all">All Types</option>
              <option value="failed_login">Failed Login</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
              <option value="unauthorized_access">Unauthorized Access</option>
              <option value="data_breach_attempt">Data Breach Attempt</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-2">
              Status
            </label>
            <select
              value={filters.resolved}
              onChange={(e) => setFilters({ ...filters, resolved: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
            >
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>
      )}

      {/* Dispute Filters (Super Admin Only) */}
      {activeTab === 'disputes' && isSuperAdmin && (
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-2">
                Status
              </label>
              <select
                value={disputeFilters.status}
                onChange={(e) => setDisputeFilters({ ...disputeFilters, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="awaiting_response">Awaiting Response</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-gray dark:text-brand-white/70 mb-2">
                Category
              </label>
              <select
                value={disputeFilters.category}
                onChange={(e) => setDisputeFilters({ ...disputeFilters, category: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
              >
                <option value="all">All Categories</option>
                <option value="vehicle_damage">Vehicle Damage</option>
                <option value="late_return">Late Return</option>
                <option value="cleaning_fee">Cleaning Fee</option>
                <option value="mechanical_issue">Mechanical Issue</option>
                <option value="safety_concern">Safety Concern</option>
                <option value="billing_issue">Billing Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'events' && (
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
          {filteredEvents.length > 0 ? (
            <div className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-6 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(
                            event.severity
                          )}`}
                        >
                          {event.severity.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-brand-navy dark:text-brand-white">
                          {getEventTypeLabel(event.event_type)}
                        </span>
                        {event.resolved && (
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                            Resolved
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-2">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-brand-gray dark:text-brand-white/50">
                        {event.ip_address && <span>IP: {event.ip_address}</span>}
                        {event.user_agent && (
                          <span className="truncate max-w-xs">UA: {event.user_agent}</span>
                        )}
                        <span>{formatDateLong(event.created_at)}</span>
                      </div>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-brand-blue dark:text-brand-blue-light cursor-pointer hover:underline">
                            View Metadata
                          </summary>
                          <pre className="mt-2 p-2 bg-brand-gray/5 dark:bg-brand-navy/30 rounded text-xs overflow-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    {!event.resolved && (
                      <button
                        onClick={() => handleResolveEvent(event.id)}
                        disabled={loading}
                        className="ml-4 px-4 py-2 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">
              No security events found matching the selected filters
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
          {auditLogs.length > 0 ? (
            <div className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-6 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            log.success
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          }`}
                        >
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                        <span className="text-sm font-medium text-brand-navy dark:text-brand-white">
                          {log.action}
                        </span>
                        <span className="text-xs text-brand-gray dark:text-brand-white/50">
                          {log.resource_type}
                        </span>
                        {log.actor_role && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                            {log.actor_role}
                          </span>
                        )}
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{log.error_message}</p>
                      )}
                      {log.notes && (
                        <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-2">{log.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-brand-gray dark:text-brand-white/50">
                        {log.ip_address && <span>IP: {log.ip_address}</span>}
                        {log.user_agent && <span className="truncate max-w-xs">UA: {log.user_agent}</span>}
                        <span>{formatDateLong(log.created_at)}</span>
                      </div>
                      {(log.previous_state || log.new_state || (log.details && Object.keys(log.details).length > 0)) && (
                        <details className="mt-2">
                          <summary className="text-xs text-brand-blue dark:text-brand-blue-light cursor-pointer hover:underline">
                            View Details
                          </summary>
                          <div className="mt-2 space-y-2">
                            {log.previous_state && (
                              <div>
                                <p className="text-xs font-medium mb-1">Previous State:</p>
                                <pre className="p-2 bg-brand-gray/5 dark:bg-brand-navy/30 rounded text-xs overflow-auto">
                                  {JSON.stringify(log.previous_state, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_state && (
                              <div>
                                <p className="text-xs font-medium mb-1">New State:</p>
                                <pre className="p-2 bg-brand-gray/5 dark:bg-brand-navy/30 rounded text-xs overflow-auto">
                                  {JSON.stringify(log.new_state, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-1">Details:</p>
                                <pre className="p-2 bg-brand-gray/5 dark:bg-brand-navy/30 rounded text-xs overflow-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">No audit logs found</div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
          <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">
            User activity view - Coming soon
          </div>
        </div>
      )}

      {activeTab === 'disputes' && isSuperAdmin && (
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
          {disputes.length > 0 ? (
            <div className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
              {disputes.map((dispute) => {
                const workflow = disputeWorkflowData[dispute.id] || { messages: [], evidence: [], decisions: [] }
                const booking = dispute.bookings
                const vehicle = booking?.vehicles
                const renter = booking?.profiles
                const openedBy = dispute.profiles

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'open':
                      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    case 'awaiting_response':
                      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                    case 'under_review':
                      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                    case 'resolved':
                      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    case 'escalated':
                      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                    case 'closed':
                      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    default:
                      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }
                }

                const getCategoryLabel = (category: string) => {
                  return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                }

                return (
                  <div key={dispute.id} className="p-6 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(dispute.status)}`}>
                            {dispute.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-brand-navy dark:text-brand-white">
                            {getCategoryLabel(dispute.category)}
                          </span>
                          {openedBy && (
                            <span className="text-xs text-brand-gray dark:text-brand-white/50">
                              Opened by: {openedBy.full_name || 'Unknown'} ({openedBy.role})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-brand-navy dark:text-brand-white mb-2 font-medium">{dispute.summary}</p>
                        {vehicle && renter && (
                          <div className="text-xs text-brand-gray dark:text-brand-white/50 mb-2">
                            <span>
                              Booking: {vehicle.year} {vehicle.make} {vehicle.model} - {renter.full_name || 'Unknown Renter'}
                            </span>
                            {booking && (
                              <span className="ml-4">
                                Dates: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-brand-gray dark:text-brand-white/50">
                          Created: {formatDateLong(dispute.created_at)} | Updated: {formatDateLong(dispute.updated_at)}
                        </div>
                      </div>
                    </div>

                    {/* Workflow Activities */}
                    <div className="mt-4 space-y-3">
                      {/* Messages */}
                      {workflow.messages.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-brand-navy dark:text-brand-white mb-2">
                            Messages ({workflow.messages.length})
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {workflow.messages.map((msg) => (
                              <div
                                key={msg.id}
                                className="text-xs p-2 bg-brand-gray/5 dark:bg-brand-navy/30 rounded border border-brand-gray/10 dark:border-brand-navy/50"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium text-brand-navy dark:text-brand-white">
                                    {msg.profiles?.full_name || 'Unknown'} ({msg.sender_role})
                                  </span>
                                  <span className="text-brand-gray dark:text-brand-white/50">{formatDate(msg.created_at)}</span>
                                </div>
                                <p className="text-brand-gray dark:text-brand-white/70">{msg.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence */}
                      {workflow.evidence.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-brand-navy dark:text-brand-white mb-2">
                            Evidence ({workflow.evidence.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {workflow.evidence.map((ev) => (
                              <div
                                key={ev.id}
                                className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                              >
                                {ev.file_type} - {ev.profiles?.full_name || 'Unknown'} ({ev.uploaded_by_role})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decisions */}
                      {workflow.decisions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-brand-navy dark:text-brand-white mb-2">
                            Decisions ({workflow.decisions.length})
                          </h4>
                          <div className="space-y-2">
                            {workflow.decisions.map((decision) => (
                              <div
                                key={decision.id}
                                className="text-xs p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium text-brand-navy dark:text-brand-white">
                                    {decision.decision.replace(/_/g, ' ').toUpperCase()} by {decision.profiles?.full_name || 'Unknown'} (
                                    {decision.decided_by_role})
                                  </span>
                                  <span className="text-brand-gray dark:text-brand-white/50">{formatDate(decision.created_at)}</span>
                                </div>
                                <p className="text-brand-gray dark:text-brand-white/70">{decision.notes}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {workflow.messages.length === 0 && workflow.evidence.length === 0 && workflow.decisions.length === 0 && (
                        <div className="text-xs text-brand-gray dark:text-brand-white/50 italic">No workflow activities yet</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">
              No disputes found matching the selected filters
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getDateFilter(range: string): Date | null {
  const now = new Date()
  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000)
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return null
  }
}