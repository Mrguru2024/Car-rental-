'use client'

import dynamic from 'next/dynamic'

const AdminsManagementClient = dynamic(() => import('./AdminsManagementClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-brand-gray dark:text-brand-white/70">Loading admin management...</div>
    </div>
  ),
})

interface AdminsManagementWrapperProps {
  initialAdmins: any[]
}

export default function AdminsManagementWrapper(props: AdminsManagementWrapperProps) {
  return <AdminsManagementClient {...props} />
}
