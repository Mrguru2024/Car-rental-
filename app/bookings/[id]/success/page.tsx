import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'

export default async function BookingSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { id } = await params

  // Fetch booking with vehicle details
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, vehicles(id, make, model, year, vehicle_photos(file_path))')
    .eq('id', id)
    .eq('renter_id', user.id)
    .single()

  if (error || !booking) {
    notFound()
  }

  const vehicle = booking.vehicles
  const imageUrl =
    vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
      ? vehicle.vehicle_photos[0].file_path
      : `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Your booking has been successfully confirmed
          </p>
        </div>

        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 mb-6">
          <div className="flex gap-4 mb-6">
            <div className="w-32 h-24 bg-brand-gray/10 dark:bg-brand-navy rounded overflow-hidden flex-shrink-0">
              <img
                src={imageUrl}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-1">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-3">
                Booking ID: {booking.id.slice(0, 8)}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-gray dark:text-brand-white/70">Pick-up:</span>
                  <span className="text-brand-navy dark:text-brand-white font-medium">
                    {formatDate(booking.start_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray dark:text-brand-white/70">Return:</span>
                  <span className="text-brand-navy dark:text-brand-white font-medium">
                    {formatDate(booking.end_date)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-brand-gray/20 dark:border-brand-navy/50">
                  <span className="text-brand-gray dark:text-brand-white/70">Total:</span>
                  <span className="text-brand-blue dark:text-brand-blue-light font-bold">
                    ${booking.total_price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {booking.status === 'confirmed' && (
            <div className="bg-brand-green/10 dark:bg-brand-green/20 border border-brand-green/20 dark:border-brand-green/30 rounded-lg p-4">
              <p className="text-sm text-brand-green dark:text-brand-green-light">
                ✓ Your payment has been processed and your booking is confirmed.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/renter/bookings"
            className="px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium"
          >
            View My Bookings
          </Link>
          <Link
            href="/listings"
            className="px-6 py-3 bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white border border-brand-gray dark:border-brand-navy rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium"
          >
            Browse More Vehicles
          </Link>
        </div>
      </div>
    </div>
  )
}