'use client'

import dynamic from 'next/dynamic'

// Client component wrapper for dynamic import with ssr: false
const SecurityMonitoringClient = dynamic(() => import('./SecurityMonitoringClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-brand-gray dark:text-brand-white/70">Loading security monitoring...</div>
    </div>
  ),
})

interface SecurityMonitoringWrapperProps {
  initialSecurityEvents: any[]
  initialAuditLogs: any[]
  isSuperAdmin: boolean
  stats: {
    totalEvents: number
    unresolvedEvents: number
    criticalEvents: number
    highSeverityEvents: number
    failedLogins: number
  }
}

export default function SecurityMonitoringWrapper(props: SecurityMonitoringWrapperProps) {
  return <SecurityMonitoringClient {...props} />
}
