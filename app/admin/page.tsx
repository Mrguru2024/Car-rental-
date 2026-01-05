import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/admin')
  }

  // Get user profile to check admin role (admin, prime_admin, or super_admin can access)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    !profile ||
    (profile.role !== 'admin' && profile.role !== 'prime_admin' && profile.role !== 'super_admin')
  ) {
    redirect('/')
  }

  // Get overview statistics
  // For super admin, also get signup statistics
  const isSuperAdmin = profile?.role === 'super_admin'
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = isSuperAdmin ? createAdminClient() : null

  const [
    { count: totalUsers },
    { count: totalRenters },
    { count: totalDealers },
    { count: totalVehicles },
    { count: totalBookings },
    { count: activeBookingsCount },
    { data: recentBookings },
    { data: securityEvents },
    { count: pendingByoiCount },
    { count: pendingVerificationsCount },
    { data: totalRevenueResult },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'renter'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['dealer', 'private_host']),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase
      .from('bookings')
      .select('id, start_date, end_date, status, total_price, created_at, vehicles(id, make, model, year), profiles!bookings_renter_id_fkey(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('security_events')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('byoi_documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending')
      .not('role', 'in', '(admin,prime_admin,super_admin)'),
    supabase
      .from('bookings')
      .select('total_price')
      .in('status', ['confirmed', 'completed']),
  ])

  // Get signup statistics (super admin only - requires admin client)
  let totalSignups = 0
  let pendingOnboardingCount = 0
  
  if (isSuperAdmin && adminSupabase) {
    try {
      // Get all auth users
      const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
      totalSignups = authUsers?.length || 0

      // Get all profile user_ids
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('user_id')
      
      const profileUserIds = new Set(profiles?.map(p => p.user_id) || [])
      
      // Count users without profiles (pending onboarding)
      pendingOnboardingCount = authUsers?.filter(user => !profileUserIds.has(user.id)).length || 0
    } catch (error) {
      console.error('Error fetching signup statistics:', error)
      // Continue with default values if there's an error
    }
  }

  // Calculate total revenue
  const totalRevenue =
    totalRevenueResult?.reduce((sum: number, booking: any) => sum + (booking.total_price || 0), 0) || 0

  // Calculate platform revenue (difference between total and dealer payouts)
  const { data: bookingsWithPayouts } = await supabase
    .from('bookings')
    .select('total_price, dealer_payout_amount_cents, platform_fee_cents')
    .in('status', ['confirmed', 'completed'])

  const platformRevenue =
    bookingsWithPayouts?.reduce((sum: number, booking: any) => {
      const platformFee = booking.platform_fee_cents ? booking.platform_fee_cents / 100 : 0
      return sum + platformFee
    }, 0) || 0

  // Get critical security events
  const criticalEvents = securityEvents?.filter((e: any) => e.severity === 'critical' || e.severity === 'high') || []

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Overview and management of the platform
          </p>
        </div>

        {/* Security Alerts */}
        {criticalEvents.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-1">
                  Security Alert
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {criticalEvents.length} high priority security event{criticalEvents.length !== 1 ? 's' : ''}{' '}
                  require attention
                </p>
              </div>
              <Link
                href="/admin/security"
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm font-medium"
              >
                View Events
              </Link>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className={`grid grid-cols-2 fold:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 xs:gap-4 sm:gap-6 mb-6 xs:mb-8`}>
          {/* Total Signups (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
                Total Signups
              </h3>
              <p className="text-3xl font-bold text-brand-blue dark:text-brand-blue-light">
                {totalSignups || 0}
              </p>
              <div className="mt-2 flex flex-col gap-1 text-xs text-brand-gray dark:text-brand-white/50">
                <span>{totalUsers || 0} with profiles</span>
                {pendingOnboardingCount > 0 && (
                  <span className="text-orange-600 dark:text-orange-400">
                    {pendingOnboardingCount} pending onboarding
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Total Users
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {totalUsers || 0}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-brand-gray dark:text-brand-white/50">
              <span>{totalRenters || 0} renters</span>
              <span>{totalDealers || 0} dealers</span>
            </div>
            {(pendingVerificationsCount || 0) > 0 && (
              <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                {pendingVerificationsCount || 0} pending verification
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Total Vehicles
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {totalVehicles || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Active Bookings
            </h3>
            <p className="text-3xl font-bold text-brand-green dark:text-brand-green-light">
              {activeBookingsCount || 0}
            </p>
            <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
              {totalBookings || 0} total
            </p>
          </div>

          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Platform Revenue
            </h3>
            <p className="text-3xl font-bold text-brand-blue dark:text-brand-blue-light">
              {formatCurrency(platformRevenue)}
            </p>
            <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
              {formatCurrency(totalRevenue)} total
            </p>
          </div>
        </div>

        {/* Quick Actions - Different for Regular Admin vs Prime/Super Admin */}
        {profile?.role === 'admin' ? (
          // Regular Admin - Limited Tools (Account Approvals & Tech Support)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Link
              href="/admin/byoi"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                  BYOI Approvals
                </h3>
                {pendingByoiCount && pendingByoiCount > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-semibold rounded-full">
                    {pendingByoiCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Review insurance documents
              </p>
            </Link>

            <Link
              href="/admin/verifications"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                  Account Verifications
                </h3>
                {pendingVerificationsCount && pendingVerificationsCount > 0 && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full">
                    {pendingVerificationsCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Review user verifications
              </p>
              {pendingOnboardingCount > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {pendingOnboardingCount} pending onboarding
                </p>
              )}
            </Link>

            <Link
              href="/admin/support"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
                Tech Support
              </h3>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Customer service and support tools
              </p>
            </Link>
          </div>
        ) : (
          // Prime Admin & Super Admin - Full Access
          <div className={`grid grid-cols-1 md:grid-cols-2 ${profile?.role === 'super_admin' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 mb-8`}>
            <Link
              href="/admin/blog"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
                Blog Management
              </h3>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Create and manage blog posts for SEO
              </p>
            </Link>
            <Link
              href="/admin/byoi"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                  BYOI Approvals
                </h3>
                {pendingByoiCount && pendingByoiCount > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-semibold rounded-full">
                    {pendingByoiCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Review insurance documents
              </p>
            </Link>

            <Link
              href="/admin/verifications"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                  Verifications
                </h3>
                {pendingVerificationsCount && pendingVerificationsCount > 0 && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full">
                    {pendingVerificationsCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Review user verifications
              </p>
              {isSuperAdmin && pendingOnboardingCount > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {pendingOnboardingCount} pending onboarding
                </p>
              )}
            </Link>

            <Link
              href="/admin/security"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                  Security Events
                </h3>
                {securityEvents && securityEvents.length > 0 && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs font-semibold rounded-full">
                    {securityEvents.length}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Monitor security activity
              </p>
            </Link>

            <Link
              href="/admin/permissions"
              className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border-2 border-purple-200 dark:border-purple-800/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                  Permissions
                </h3>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                  {profile?.role === 'super_admin' ? 'Super Admin' : 'Prime Admin'}
                </span>
              </div>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">
                Manage user roles and permissions
              </p>
            </Link>

            {profile?.role === 'super_admin' && (
              <>
                <Link
                  href="/admin/users"
                  className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border-2 border-purple-200 dark:border-purple-800/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                      User Management
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-sm text-brand-gray dark:text-brand-white/70">
                    Manage all users with support & troubleshooting tools
                  </p>
                </Link>
                <Link
                  href="/admin/admins"
                  className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border-2 border-purple-200 dark:border-purple-800/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                      Admin Management
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-sm text-brand-gray dark:text-brand-white/70">
                    Create and manage admin users
                  </p>
                </Link>
              </>
            )}

            {(profile?.role === 'prime_admin' || profile?.role === 'super_admin') && (
              <Link
                href="/admin/document-audit"
                className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border-2 border-purple-200 dark:border-purple-800/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                    Document Audit
                  </h3>
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                    Prime Admin
                  </span>
                </div>
                <p className="text-sm text-brand-gray dark:text-brand-white/70">
                  Review flagged documents from automated bot checks
                </p>
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Bookings */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                Recent Bookings
              </h2>
              <Link
                href="/admin/bookings"
                className="text-brand-blue dark:text-brand-blue-light hover:underline text-sm"
              >
                View All
              </Link>
            </div>
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
              {recentBookings && recentBookings.length > 0 ? (
                <div className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
                  {recentBookings.map((booking: any) => {
                    const vehicle = booking.vehicles
                    const renter = booking.profiles
                    return (
                      <Link
                        key={booking.id}
                        href={`/admin/bookings/${booking.id}`}
                        className="block p-4 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </h3>
                            <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-1">
                              {renter?.full_name || 'Unknown Renter'}
                            </p>
                            <p className="text-xs text-brand-gray dark:text-brand-white/50">
                              {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-brand-blue dark:text-brand-blue-light">
                              {formatCurrency(booking.total_price)}
                            </p>
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize mt-1 ${
                                booking.status === 'confirmed'
                                  ? 'bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light'
                                  : booking.status === 'pending_payment'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                  : booking.status === 'canceled'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                              }`}
                            >
                              {booking.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">
                  No bookings yet
                </div>
              )}
            </div>
          </div>

          {/* Security Events */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                Security Events
              </h2>
              <Link
                href="/admin/security"
                className="text-brand-blue dark:text-brand-blue-light hover:underline text-sm"
              >
                View All
              </Link>
            </div>
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
              {securityEvents && securityEvents.length > 0 ? (
                <div className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
                  {securityEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className="p-4 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                            {event.event_type.replace('_', ' ').replace(/\b\w/g, (l: string) =>
                              l.toUpperCase()
                            )}
                          </h3>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-1">
                            {event.description || 'No description'}
                          </p>
                          <p className="text-xs text-brand-gray dark:text-brand-white/50">
                            {formatDate(event.created_at)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded capitalize ${
                            event.severity === 'critical'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              : event.severity === 'high'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                              : event.severity === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          {event.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">
                  No unresolved security events
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
