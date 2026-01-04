import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import CalendarClient from './CalendarClient'
import { formatDate } from '@/lib/utils/format'

export default async function DealerCalendarPage() {
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
    .select('id, make, model, year, status')
    .eq('dealer_id', profile.id)
    .order('make', { ascending: true })

  const vehicleIds = vehicles?.map((v) => v.id) || []

  // Get all bookings
  const { data: bookings } = vehicleIds.length > 0
    ? await supabase
        .from('bookings')
        .select('*, vehicles(id, make, model, year), profiles!bookings_renter_id_fkey(full_name)')
        .in('vehicle_id', vehicleIds)
        .in('status', ['confirmed', 'pending_payment'])
        .order('start_date', { ascending: true })
    : { data: [] }

  // Format bookings for calendar
  const calendarBookings = bookings?.map((booking: any) => ({
    id: booking.id,
    vehicleId: booking.vehicle_id,
    vehicleName: `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`,
    renterName: booking.profiles?.full_name || 'Unknown',
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
  })) || []

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Availability Calendar
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            View and manage your vehicle availability
          </p>
        </div>

        {vehicles && vehicles.length > 0 ? (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
            <CalendarClient vehicles={vehicles} bookings={calendarBookings} />
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-12 text-center border border-brand-white dark:border-brand-navy/50">
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              No vehicles found. Add a vehicle to see the calendar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
