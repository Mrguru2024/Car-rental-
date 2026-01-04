'use client'

import dynamic from 'next/dynamic'

const ByoiApprovalClient = dynamic(() => import('./ByoiApprovalClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-brand-gray dark:text-brand-white/70">Loading BYOI approvals...</div>
    </div>
  ),
})

interface ByoiApprovalWrapperProps {
  byoiDocs: any[]
}

export default function ByoiApprovalWrapper(props: ByoiApprovalWrapperProps) {
  return <ByoiApprovalClient {...props} />
}
