import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default async function DealerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'dealer' && profile.role !== 'private_host')) {
    redirect('/onboarding')
  }

  // Get vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*, vehicle_photos(file_path)')
    .eq('dealer_id', profile.id)
    .order('created_at', { ascending: false })

  // Get bookings for vehicles
  const vehicleIds = vehicles?.map(v => v.id) || []
  const { data: bookings } = vehicleIds.length > 0
    ? await supabase
        .from('bookings')
        .select('*, vehicles(id, make, model, year)')
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: null }

  const activeBookings = bookings?.filter((b: any) => b.status === 'confirmed') || []
  const totalRevenue = bookings?.reduce((sum: number, b: any) => {
    if (b.status === 'confirmed' || b.status === 'completed') {
      return sum + (b.dealer_payout_amount_cents || 0) / 100
    }
    return sum
  }, 0) || 0

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Dealer Dashboard
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Welcome back, {profile.full_name || 'Dealer'}
          </p>
        </div>

        {/* Verification Status */}
        {profile.verification_status !== 'approved' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Verification Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {profile.verification_status === 'pending'
                    ? 'Your verification is being reviewed. You can still manage your listings.'
                    : 'Please complete verification to receive bookings.'}
                </p>
              </div>
              <Link
                href="/dealer/verification"
                className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors text-sm font-medium"
              >
                {profile.verification_status === 'pending' ? 'View Status' : 'Verify Now'}
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Total Vehicles
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {vehicles?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Active Bookings
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {activeBookings.length}
            </p>
          </div>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Total Revenue
            </h3>
            <p className="text-3xl font-bold text-brand-green dark:text-brand-green-light">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Verification
            </h3>
            <p className="text-lg font-semibold text-brand-green dark:text-brand-green-light capitalize">
              {profile.verification_status}
            </p>
          </div>
        </div>

        {/* Recent Bookings */}
        {bookings && bookings.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                Recent Bookings
              </h2>
              <Link
                href="/dealer/bookings"
                className="text-brand-blue dark:text-brand-blue-light hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking: any) => {
                const vehicle = booking.vehicles
                return (
                  <div
                    key={booking.id}
                    className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-2">
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded capitalize ${
                          booking.status === 'confirmed' 
                            ? 'bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light'
                            : booking.status === 'pending_payment'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand-blue dark:text-brand-blue-light">
                          {formatCurrency((booking.dealer_payout_amount_cents || 0) / 100)}
                        </p>
                        <p className="text-xs text-brand-gray dark:text-brand-white/50">Payout</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dealer/vehicles/new"
            className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
          >
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
              Add New Vehicle
            </h3>
            <p className="text-sm text-brand-gray dark:text-brand-white/70">
              List a new vehicle for rent
            </p>
          </Link>
          <Link
            href="/dealer/vehicles"
            className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
          >
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
              Manage Vehicles
            </h3>
            <p className="text-sm text-brand-gray dark:text-brand-white/70">
              View and edit your vehicle listings
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}