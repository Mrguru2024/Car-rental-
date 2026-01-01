import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default async function RenterDashboardPage() {
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
    .single()

  if (!profile || profile.role !== 'renter') {
    redirect('/onboarding')
  }

  // Get recent bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, vehicles(id, make, model, year, vehicle_photos(file_path))')
    .eq('renter_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const upcomingBookings =
    bookings?.filter(
      (b: any) => b.status === 'confirmed' && new Date(b.start_date) >= new Date()
    ) || []

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Renter Dashboard
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Welcome back, {profile.full_name || 'Renter'}
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
                    ? 'Your verification is being reviewed. You can still browse vehicles.'
                    : 'Please complete verification to book vehicles.'}
                </p>
              </div>
              <Link
                href="/renter/verification"
                className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors text-sm font-medium"
              >
                {profile.verification_status === 'pending' ? 'View Status' : 'Verify Now'}
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Total Bookings
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {bookings?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Upcoming Trips
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {upcomingBookings.length}
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

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                Upcoming Trips
              </h2>
              <Link
                href="/renter/bookings"
                className="text-brand-blue dark:text-brand-blue-light hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingBookings.map((booking: any) => {
                const vehicle = booking.vehicles
                const imageUrl =
                  vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
                    ? vehicle.vehicle_photos[0].file_path
                    : `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`
                return (
                  <Link
                    key={booking.id}
                    href={`/renter/bookings`}
                    className="block bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
                  >
                    <div className="flex gap-4">
                      <div className="w-24 h-20 bg-brand-gray/10 dark:bg-brand-navy rounded overflow-hidden flex-shrink-0">
                        <img
                          src={imageUrl}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-2">
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-brand-blue dark:text-brand-blue-light">
                            {formatCurrency(booking.total_price)}
                          </span>
                          <span className="px-2 py-1 bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light text-xs font-semibold rounded capitalize">
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/listings"
            className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
          >
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
              Browse Vehicles
            </h3>
            <p className="text-sm text-brand-gray dark:text-brand-white/70">
              Find your next rental vehicle
            </p>
          </Link>
          <Link
            href="/renter/bookings"
            className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
          >
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
              My Bookings
            </h3>
            <p className="text-sm text-brand-gray dark:text-brand-white/70">
              View all your bookings and trip history
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}