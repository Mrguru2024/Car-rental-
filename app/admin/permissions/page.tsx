import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import PermissionsWrapper from './PermissionsWrapper'
import { protectPrimeAdminRoute } from '@/lib/security/routeProtection'

export default async function PermissionsPage() {
  // Protect route - only Prime Admins and Super Admins can access
  const { user, profile } = await protectPrimeAdminRoute()

  if (!user || !profile) {
    redirect('/')
  }

  const supabase = await createClient()

  // Get initial user list (first page)
  const { data: initialUsers, count: totalUsers } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, email, role, verification_status, created_at, updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .limit(50)

  // Get auth user emails
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()
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

  // Get role counts
  const [
    { count: adminCount },
    { count: primeAdminCount },
    { count: superAdminCount },
    { count: dealerCount },
    { count: renterCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'prime_admin'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['dealer', 'private_host']),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'renter'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending')
      .not('role', 'in', '(admin,prime_admin,super_admin)'),
  ])

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
                Permissions Dashboard
              </h1>
              <p className="text-brand-gray dark:text-brand-white/70">
                Manage user roles, status, and permissions
              </p>
            </div>
            {profile.role === 'super_admin' && (
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm font-semibold rounded-full">
                Super Admin
              </span>
            )}
            {profile.role === 'prime_admin' && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-full">
                Prime Admin
              </span>
            )}
          </div>
        </div>

        {/* Role Statistics */}
        <div className="grid grid-cols-2 fold:grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 xs:gap-4 sm:gap-6 mb-6 xs:mb-8">
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-xs xs:text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Total Users
            </h3>
            <p className="text-2xl xs:text-3xl font-bold text-brand-navy dark:text-brand-white">
              {totalUsers || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-xs xs:text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Admins
            </h3>
            <p className="text-2xl xs:text-3xl font-bold text-brand-blue dark:text-brand-blue-light">
              {adminCount || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-xs xs:text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Prime Admins
            </h3>
            <p className="text-2xl xs:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {primeAdminCount || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-xs xs:text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Super Admins
            </h3>
            <p className="text-2xl xs:text-3xl font-bold text-purple-800 dark:text-purple-300">
              {superAdminCount || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-xs xs:text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Dealers
            </h3>
            <p className="text-2xl xs:text-3xl font-bold text-brand-green dark:text-brand-green-light">
              {dealerCount || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-xs xs:text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Pending
            </h3>
            <p className="text-2xl xs:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {pendingCount || 0}
            </p>
          </div>
        </div>

        <PermissionsWrapper
          initialUsers={enrichedUsers}
          totalUsers={totalUsers || 0}
          currentUserRole={profile.role}
        />
      </div>
    </div>
  )
}
