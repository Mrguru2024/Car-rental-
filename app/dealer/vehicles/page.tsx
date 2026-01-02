import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'

export default async function DealerVehiclesPage() {
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

  const activeVehicles = vehicles?.filter((v: any) => v.status === 'active') || []
  const inactiveVehicles = vehicles?.filter((v: any) => v.status === 'inactive') || []

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
                My Vehicles
              </h1>
              <p className="text-brand-gray dark:text-brand-white/70">
                Manage your vehicle listings
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/dealer"
                className="px-4 py-2 text-brand-blue dark:text-brand-blue-light hover:underline"
              >
                ← Dashboard
              </Link>
              <Link
                href="/dealer/vehicles/new"
                className="px-6 py-2 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium"
              >
                + Add Vehicle
              </Link>
            </div>
          </div>
        </div>

        {vehicles && vehicles.length > 0 ? (
          <div className="space-y-6">
            {/* Active Vehicles */}
            {activeVehicles.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                  Active Vehicles ({activeVehicles.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeVehicles.map((vehicle: any) => {
                    const hasPhotos = vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
                    const imageUrl = hasPhotos
                      ? vehicle.vehicle_photos[0].file_path
                      : `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`

                    return (
                      <div
                        key={vehicle.id}
                        className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
                      >
                        <div className="w-full h-48 bg-brand-gray/10 dark:bg-brand-navy overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-bold text-brand-navy dark:text-brand-white mb-1">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h3>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-2">
                            {vehicle.location}
                          </p>
                          <p className="text-lg font-semibold text-brand-green dark:text-brand-green-light mb-4">
                            {formatCurrency(vehicle.price_per_day)}/day
                          </p>
                          <div className="flex gap-2">
                            <Link
                              href={`/dealer/vehicles/${vehicle.id}/edit`}
                              className="flex-1 text-center px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors text-sm font-medium"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/listings/${vehicle.id}`}
                              className="flex-1 text-center px-4 py-2 bg-white dark:bg-brand-navy text-brand-blue dark:text-brand-blue-light border border-brand-blue dark:border-brand-blue-light rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors text-sm font-medium"
                              target="_blank"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Inactive Vehicles */}
            {inactiveVehicles.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                  Inactive Vehicles ({inactiveVehicles.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveVehicles.map((vehicle: any) => {
                    const hasPhotos = vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
                    const imageUrl = hasPhotos
                      ? vehicle.vehicle_photos[0].file_path
                      : `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`

                    return (
                      <div
                        key={vehicle.id}
                        className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden opacity-75 hover:opacity-100 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-all"
                      >
                        <div className="w-full h-48 bg-brand-gray/10 dark:bg-brand-navy overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-brand-navy dark:text-brand-white">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </h3>
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                              Inactive
                            </span>
                          </div>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-2">
                            {vehicle.location}
                          </p>
                          <p className="text-lg font-semibold text-brand-green dark:text-brand-green-light mb-4">
                            {formatCurrency(vehicle.price_per_day)}/day
                          </p>
                          <div className="flex gap-2">
                            <Link
                              href={`/dealer/vehicles/${vehicle.id}/edit`}
                              className="flex-1 text-center px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors text-sm font-medium"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/listings/${vehicle.id}`}
                              className="flex-1 text-center px-4 py-2 bg-white dark:bg-brand-navy text-brand-blue dark:text-brand-blue-light border border-brand-blue dark:border-brand-blue-light rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors text-sm font-medium"
                              target="_blank"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-12 border border-brand-white dark:border-brand-navy/50 text-center">
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You haven't added any vehicles yet. Get started by adding your first vehicle.
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
