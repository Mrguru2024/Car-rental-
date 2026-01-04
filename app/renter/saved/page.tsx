import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'
import SavedVehiclesClient from './SavedVehiclesClient'
import VehicleCard from '@/components/Vehicle/VehicleCard'

export default async function SavedVehiclesPage() {
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

  // Get saved vehicles
  const { data: savedVehicles } = await supabase
    .from('saved_vehicles')
    .select('*, vehicles(*, vehicle_photos(file_path))')
    .eq('renter_id', profile.id)
    .eq('vehicles.status', 'active')
    .order('created_at', { ascending: false })

  const vehicles = savedVehicles?.map((sv: any) => sv.vehicles).filter(Boolean) || []

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Saved Vehicles
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Your favorite vehicles for easy access
          </p>
        </div>

        {vehicles.length > 0 ? (
          <div className="grid grid-cols-1 fold:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 lg:gap-8">
            {vehicles.map((vehicle: any) => (
              <SavedVehiclesClient key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-8 sm:p-12 text-center border border-brand-white dark:border-brand-navy/50">
            <svg
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-brand-gray dark:text-brand-white/50 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h3 className="text-lg sm:text-xl font-semibold text-brand-navy dark:text-brand-white mb-2">
              No saved vehicles yet
            </h3>
            <p className="text-sm sm:text-base text-brand-gray dark:text-brand-white/70 mb-6">
              Start saving vehicles you're interested in by clicking the heart icon
            </p>
            <Link
              href="/listings"
              className="inline-block px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center justify-center"
            >
              Browse Vehicles
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
