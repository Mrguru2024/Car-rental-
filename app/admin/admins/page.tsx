import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import AdminsManagementWrapper from './AdminsManagementWrapper'

export default async function AdminsManagementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/admin/admins')
  }

  // Get user profile to check role - only super_admin can access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/admin')
  }

  // Get existing admin users
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()
  const { data: adminUsers, error } = await adminSupabase.rpc('list_admin_users')

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Admin Management
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Create and manage admin users (Super Admin Only)
          </p>
        </div>

        <AdminsManagementWrapper initialAdmins={adminUsers || []} />
      </div>
    </div>
  )
}
