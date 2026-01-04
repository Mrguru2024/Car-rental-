import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import AnalyticsClient from './AnalyticsClient'

export default async function DealerAnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

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
    .select('id, make, model, year, price_per_day, status')
    .eq('dealer_id', profile.id)

  const vehicleIds = vehicles?.map((v) => v.id) || []

  // Get all bookings
  const { data: allBookings } = vehicleIds.length > 0
    ? await supabase
        .from('bookings')
        .select('*, vehicles(id, make, model, year, price_per_day)')
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Calculate metrics
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const recentBookings = allBookings?.filter(
    (b: any) => new Date(b.created_at) >= thirtyDaysAgo
  ) || []

  const totalRevenue = allBookings
    ?.filter((b: any) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum: number, b: any) => sum + (b.dealer_payout_amount_cents || 0) / 100, 0) || 0

  const recentRevenue = recentBookings
    .filter((b: any) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum: number, b: any) => sum + (b.dealer_payout_amount_cents || 0) / 100, 0)

  const activeBookings = allBookings?.filter((b: any) => b.status === 'confirmed') || []

  // Calculate occupancy rate (days booked / total available days)
  const totalDays = vehicles?.reduce((sum, v) => {
    const vehicleBookings = allBookings?.filter((b: any) => b.vehicle_id === v.id && (b.status === 'confirmed' || b.status === 'completed')) || []
    const bookedDays = vehicleBookings.reduce((days: number, b: any) => {
      const start = new Date(b.start_date)
      const end = new Date(b.end_date)
      return days + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }, 0)
    return sum + bookedDays
  }, 0) || 0

  const totalAvailableDays = vehicles?.length * 90 || 1 // Assuming 90 days lookback
  const occupancyRate = totalAvailableDays > 0 ? (totalDays / totalAvailableDays) * 100 : 0

  // Average booking value
  const completedBookings = allBookings?.filter(
    (b: any) => b.status === 'confirmed' || b.status === 'completed'
  ) || []
  const avgBookingValue =
    completedBookings.length > 0
      ? completedBookings.reduce((sum: number, b: any) => sum + (b.dealer_payout_amount_cents || 0) / 100, 0) /
        completedBookings.length
      : 0

  // Revenue by vehicle
  const revenueByVehicle = vehicles?.map((vehicle) => {
    const vehicleBookings = allBookings?.filter(
      (b: any) => b.vehicle_id === vehicle.id && (b.status === 'confirmed' || b.status === 'completed')
    ) || []
    const revenue = vehicleBookings.reduce(
      (sum: number, b: any) => sum + (b.dealer_payout_amount_cents || 0) / 100,
      0
    )
    return {
      vehicle,
      revenue,
      bookings: vehicleBookings.length,
    }
  }) || []

  revenueByVehicle.sort((a, b) => b.revenue - a.revenue)

  // Monthly revenue trend (last 6 months)
  const monthlyRevenue: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    monthlyRevenue[monthKey] = 0
  }

  allBookings?.forEach((booking: any) => {
    if (booking.status === 'confirmed' || booking.status === 'completed') {
      const bookingDate = new Date(booking.created_at)
      const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (monthlyRevenue.hasOwnProperty(monthKey)) {
        monthlyRevenue[monthKey] += (booking.dealer_payout_amount_cents || 0) / 100
      }
    }
  })

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Insights into your rental business performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 fold:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 mb-6 xs:mb-8">
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Total Revenue
            </h3>
            <p className="text-3xl font-bold text-brand-green dark:text-brand-green-light">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
              All time
            </p>
          </div>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Last 30 Days
            </h3>
            <p className="text-3xl font-bold text-brand-blue dark:text-brand-blue-light">
              {formatCurrency(recentRevenue)}
            </p>
            <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
              {recentBookings.length} bookings
            </p>
          </div>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Occupancy Rate
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {occupancyRate.toFixed(1)}%
            </p>
            <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
              Last 90 days
            </p>
          </div>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
              Avg Booking Value
            </h3>
            <p className="text-3xl font-bold text-brand-navy dark:text-brand-white">
              {formatCurrency(avgBookingValue)}
            </p>
            <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
              Per booking
            </p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 mb-8">
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Revenue Trend (Last 6 Months)
          </h2>
          <AnalyticsClient monthlyRevenue={monthlyRevenue} />
        </div>

        {/* Top Performing Vehicles */}
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-6 border border-brand-white dark:border-brand-navy/50">
            <h2 className="text-lg sm:text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
              Top Performing Vehicles
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {revenueByVehicle.length > 0 ? (
                revenueByVehicle.map((item, index) => (
                  <div
                    key={item.vehicle.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-brand-white dark:bg-brand-navy rounded-lg"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue dark:text-brand-blue-light font-bold text-sm sm:text-base flex-shrink-0">
                        #{index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-brand-navy dark:text-brand-white text-sm sm:text-base truncate">
                          {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                        </h3>
                        <p className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70">
                          {item.bookings} booking{item.bookings !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-base sm:text-lg font-bold text-brand-green dark:text-brand-green-light">
                        {formatCurrency(item.revenue)}
                      </p>
                      <p className="text-xs text-brand-gray dark:text-brand-white/50">
                        Total revenue
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-brand-gray dark:text-brand-white/70 text-center py-8">
                  No bookings yet
                </p>
              )}
            </div>
          </div>
      </div>
    </div>
  )
}
