import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default async function DealerBookingsPage() {
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

  // Get vehicles owned by this dealer
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id')
    .eq('dealer_id', profile.id)

  const vehicleIds = vehicles?.map((v) => v.id) || []

  // Get all bookings for these vehicles
  const { data: bookings } = vehicleIds.length > 0
    ? await supabase
        .from('bookings')
        .select('*, vehicles(id, make, model, year, location, vehicle_photos(file_path)), profiles!bookings_renter_id_fkey(full_name, phone)')
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const getBookingStatusClassName = (status: string) => {
    if (status === 'confirmed') {
      return 'px-2 py-1 text-xs font-semibold rounded capitalize bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light'
    }
    if (status === 'pending_payment') {
      return 'px-2 py-1 text-xs font-semibold rounded capitalize bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
    }
    if (status === 'canceled') {
      return 'px-2 py-1 text-xs font-semibold rounded capitalize bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
    }
    return 'px-2 py-1 text-xs font-semibold rounded capitalize bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
                All Bookings
              </h1>
              <p className="text-brand-gray dark:text-brand-white/70">
                View and manage all bookings for your vehicles
              </p>
            </div>
            <Link
              href="/dealer"
              className="px-4 py-2 text-brand-blue dark:text-brand-blue-light hover:underline"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking: any) => {
              const vehicle = booking.vehicles
              const renter = booking.profiles
              const hasPhotos = vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
              const imageUrl = hasPhotos
                ? vehicle.vehicle_photos[0].file_path
                : `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`

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
                          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-2">
                            {vehicle.location}
                          </p>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70">
                            Rented by: {renter?.full_name || 'Unknown'}
                          </p>
                        </div>
                        <span className={getBookingStatusClassName(booking.status)}>
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
                          <p className="text-sm font-medium text-brand-navy dark:text-brand-white">
                            {formatCurrency(booking.total_price || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                            Your Payout
                          </p>
                          <p className="text-sm font-semibold text-brand-green dark:text-brand-green-light">
                            {formatCurrency((booking.dealer_payout_amount_cents || 0) / 100)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-brand-gray/20 dark:border-brand-navy/50">
                        <p className="text-xs text-brand-gray dark:text-brand-white/50">
                          Booking ID: {booking.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-12 border border-brand-white dark:border-brand-navy/50 text-center">
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              No bookings yet. Start by adding vehicles to your inventory.
            </p>
            <Link
              href="/dealer/vehicles/new"
              className="inline-block px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium"
            >
              Add Your First Vehicle
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
