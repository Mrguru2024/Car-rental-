'use client'

import dynamic from 'next/dynamic'

const DocumentAuditClient = dynamic(() => import('./DocumentAuditClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-brand-gray dark:text-brand-white/70">Loading document audit...</div>
    </div>
  ),
})

interface DocumentAuditWrapperProps {
  flaggedAudits: any[]
  pendingAudits: any[]
  currentAuditorId: string | null
}

export default function DocumentAuditWrapper(props: DocumentAuditWrapperProps) {
  return <DocumentAuditClient {...props} />
}
