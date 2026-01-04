'use client'

import dynamic from 'next/dynamic'

const PermissionsClient = dynamic(() => import('./PermissionsClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-brand-gray dark:text-brand-white/70">Loading permissions...</div>
    </div>
  ),
})

interface PermissionsWrapperProps {
  initialUsers: any[]
  totalUsers: number
  currentUserRole: string
}

export default function PermissionsWrapper(props: PermissionsWrapperProps) {
  return <PermissionsClient {...props} />
}
