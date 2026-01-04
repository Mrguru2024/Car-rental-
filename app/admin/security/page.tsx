import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import SecurityMonitoringWrapper from './SecurityMonitoringWrapper'
import { protectAdminRoute } from '@/lib/security/routeProtection'

export default async function SecurityPage() {
  // Protect route - all admins can access
  const { user, profile } = await protectAdminRoute()

  if (!user || !profile) {
    redirect('/')
  }

  const supabase = await createClient()
  const isSuperAdmin = profile?.role === 'super_admin'

  // Get initial security events (unresolved, sorted by severity and date) - reduced limit
  const { data: securityEvents } = await supabase
    .from('security_events')
    .select('*')
    .eq('resolved', false)
    .order('severity', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50) // Reduced from 100 to improve initial load

  // Get recent audit logs - reduced limit
  const { data: recentAuditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30) // Reduced from 50 to improve initial load

  // Get security event statistics (optimized - only fetch counts)
  const [
    { count: totalEvents },
    { count: unresolvedEvents },
    { count: criticalEvents },
    { count: highSeverityEvents },
    { count: failedLogins },
  ] = await Promise.all([
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
  ])

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Security Monitoring
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Real-time security event monitoring and user activity tracking
          </p>
        </div>

        <SecurityMonitoringWrapper
          initialSecurityEvents={securityEvents || []}
          initialAuditLogs={recentAuditLogs || []}
          isSuperAdmin={isSuperAdmin}
          stats={{
            totalEvents: totalEvents || 0,
            unresolvedEvents: unresolvedEvents || 0,
            criticalEvents: criticalEvents || 0,
            highSeverityEvents: highSeverityEvents || 0,
            failedLogins: failedLogins || 0,
          }}
        />
      </div>
    </div>
  )
}