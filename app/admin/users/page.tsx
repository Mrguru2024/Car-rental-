import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import SuperAdminUsersClient from './SuperAdminUsersClient'
import { isSuperAdmin } from '@/lib/utils/roleHierarchy'

export default async function SuperAdminUsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/admin/users')
  }

  // Get user profile to check role - only super_admin can access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || !isSuperAdmin(profile.role)) {
    redirect('/admin')
  }

  // Get initial user list
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()
  
  const { data: initialUsers, count: totalUsers } = await adminSupabase
    .from('profiles')
    .select('id, user_id, full_name, email, role, verification_status, created_at, updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .limit(50)

  // Get auth user emails
  const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
  const emailMap = new Map(
    authUsers?.users.map((u) => [u.id, u.email]) || []
  )

  // Enrich profiles with emails
  const enrichedUsers =
    initialUsers?.map((profile) => ({
      ...profile,
      email: profile.email || emailMap.get(profile.user_id) || 'N/A',
    })) || []

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            User Management
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Manage all users on the platform with customer support and troubleshooting tools (Super Admin Only)
          </p>
        </div>

        <SuperAdminUsersClient initialUsers={enrichedUsers} totalUsers={totalUsers || 0} />
      </div>
    </div>
  )
}