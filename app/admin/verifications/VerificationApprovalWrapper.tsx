'use client'

import dynamic from 'next/dynamic'

const VerificationApprovalClient = dynamic(() => import('./VerificationApprovalClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-brand-gray dark:text-brand-white/70">Loading verifications...</div>
    </div>
  ),
})

interface VerificationApprovalWrapperProps {
  verifications: any[]
  verificationStates: Map<string, any>
}

export default function VerificationApprovalWrapper(props: VerificationApprovalWrapperProps) {
  return <VerificationApprovalClient {...props} />
}
