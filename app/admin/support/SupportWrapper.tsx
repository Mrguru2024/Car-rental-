'use client'

import dynamic from 'next/dynamic'

const SupportClient = dynamic(() => import('./SupportClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-brand-gray dark:text-brand-white/70">Loading support dashboard...</div>
    </div>
  ),
})

interface SupportWrapperProps {
  recentBookings: any[]
  recentClaims: any[]
  pendingVerificationsCount: number
  pendingByoiCount: number
}

export default function SupportWrapper(props: SupportWrapperProps) {
  return <SupportClient {...props} />
}
