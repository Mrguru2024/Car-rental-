import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default async function RenterBookingsPage() {
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

  // Get all bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, vehicles(id, make, model, year, location, vehicle_photos(file_path))')
    .eq('renter_id', user.id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
    pending_payment: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    confirmed: 'bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light',
    canceled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            My Bookings
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            View and manage all your vehicle rentals
          </p>
        </div>

        {bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking: any) => {
              const vehicle = booking.vehicles
              const hasPhotos = vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
              const imageUrl = hasPhotos
                ? vehicle.vehicle_photos[0].file_path
                : `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`
              const statusColor = statusColors[booking.status] || statusColors.draft

              return (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 h-32 bg-brand-gray/10 dark:bg-brand-navy rounded overflow-hidden flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-1">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h3>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70">
                            {vehicle.location}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize mt-2 md:mt-0 ${statusColor}`}
                        >
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                            Pick-up Date
                          </p>
                          <p className="text-sm font-medium text-brand-navy dark:text-brand-white">
                            {formatDate(booking.start_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                            Return Date
                          </p>
                          <p className="text-sm font-medium text-brand-navy dark:text-brand-white">
                            {formatDate(booking.end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                            Total Price
                          </p>
                          <p className="text-sm font-medium text-brand-blue dark:text-brand-blue-light">
                            {formatCurrency(booking.total_price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                            Booking ID
                          </p>
                          <p className="text-sm font-mono text-brand-gray dark:text-brand-white/70">
                            {booking.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>

                      {booking.status === 'draft' && (
                        <Link
                          href={`/bookings/${booking.id}/checkout`}
                          className="inline-block px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors text-sm font-medium"
                        >
                          Complete Payment
                        </Link>
                      )}
                      {booking.status === 'confirmed' && (
                        <div className="text-sm text-brand-green dark:text-brand-green-light">
                          ✓ Booking confirmed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-12 text-center border border-brand-white dark:border-brand-navy/50">
            <svg
              className="w-16 h-16 mx-auto text-brand-gray dark:text-brand-white/50 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-2">
              No bookings yet
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-6">
              Start browsing vehicles to make your first booking
            </p>
            <Link
              href="/listings"
              className="inline-block px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium"
            >
              Browse Vehicles
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}