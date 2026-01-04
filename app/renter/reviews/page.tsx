import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import ReviewForm from './ReviewForm'

export default async function RenterReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'renter') {
    redirect('/onboarding')
  }

  // Get completed bookings without reviews
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select(
      '*, vehicles(id, make, model, year, vehicle_photos(file_path)), reviews(id)'
    )
    .eq('renter_id', profile.id)
    .eq('status', 'completed')
    .order('end_date', { ascending: false })

  // Filter out bookings that already have reviews
  const bookingsNeedingReview =
    completedBookings?.filter((b: any) => !b.reviews || b.reviews.length === 0) || []

  // Get existing reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, bookings(id, start_date, end_date), vehicles(id, make, model, year)')
    .eq('renter_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Reviews & Ratings
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Share your experience and help others make informed decisions
          </p>
        </div>

        {/* Bookings Needing Review */}
        {bookingsNeedingReview.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white mb-4">
              Pending Reviews
            </h2>
            <div className="space-y-4">
              {bookingsNeedingReview.map((booking: any) => (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-6 border border-brand-white dark:border-brand-navy/50"
                >
                  <div className="flex flex-col gap-4 sm:gap-6">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
                        {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                      </h3>
                      <p className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70 mb-4">
                        Trip: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </p>
                      <ReviewForm bookingId={booking.id} vehicleId={booking.vehicle_id} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Reviews */}
        <div>
          <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Your Reviews
          </h2>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <div
                  key={review.id}
                  className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-6 border border-brand-white dark:border-brand-navy/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                        {review.vehicles.year} {review.vehicles.make} {review.vehicles.model}
                      </h3>
                      <p className="text-sm text-brand-gray dark:text-brand-white/70">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-4 sm:gap-6">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                          Vehicle
                        </p>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-base sm:text-lg ${
                                i < review.vehicle_rating
                                  ? 'text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                          Dealer
                        </p>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-base sm:text-lg ${
                                i < review.dealer_rating
                                  ? 'text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {review.vehicle_review && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                        Vehicle Review:
                      </p>
                      <p className="text-sm text-brand-gray dark:text-brand-white/70">
                        {review.vehicle_review}
                      </p>
                    </div>
                  )}
                  {review.dealer_review && (
                    <div>
                      <p className="text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                        Dealer Review:
                      </p>
                      <p className="text-sm text-brand-gray dark:text-brand-white/70">
                        {review.dealer_review}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-8 sm:p-12 text-center border border-brand-white dark:border-brand-navy/50">
              <p className="text-sm sm:text-base text-brand-gray dark:text-brand-white/70">
                You haven't written any reviews yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
