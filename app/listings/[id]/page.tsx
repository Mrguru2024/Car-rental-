import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'
import BookingForm from '@/components/Booking/BookingForm'
import SaveButton from '@/components/Vehicle/SaveButton'
import RecallBadge from '@/components/Vehicle/RecallBadge'
import VehicleStandingCard from '@/components/Vehicle/VehicleStandingCard'
import { generateListingMetadata, generateListingJsonLd } from './metadata'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  // Check if seed vehicle
  if (id.startsWith('seed-') || id.startsWith('placeholder-')) {
    const { seedVehicles } = await import('@/lib/data/seed-vehicles')
    let seedIndex: number
    if (id.startsWith('seed-')) {
      seedIndex = parseInt(id.replace('seed-', '')) - 1
    } else {
      seedIndex = parseInt(id.replace('placeholder-', ''))
    }

    if (seedIndex >= 0 && seedIndex < seedVehicles.length) {
      const vehicle = seedVehicles[seedIndex]
      return generateListingMetadata(vehicle)
    }
  }

  // Fetch from database
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('make, model, year, location, price_per_day, description')
    .eq('id', id)
    .single()

  if (!vehicle) {
    return {
      title: 'Vehicle Not Found',
    }
  }

  return generateListingMetadata(vehicle)
}

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ start_date?: string; end_date?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { id } = await params
  const queryParams = await searchParams

  // Check if this is a seed/placeholder vehicle
  const isSeedVehicle = id.startsWith('seed-') || id.startsWith('placeholder-')
  
  let vehicle: any = null
  let error: any = null

  if (isSeedVehicle) {
    // Handle seed vehicles
    // seed-1 -> index 0, seed-2 -> index 1, etc.
    // placeholder-0 -> index 0, placeholder-1 -> index 1, etc.
    let seedIndex: number
    if (id.startsWith('seed-')) {
      seedIndex = parseInt(id.replace('seed-', '')) - 1
    } else {
      seedIndex = parseInt(id.replace('placeholder-', ''))
    }
    
    const { seedVehicles } = await import('@/lib/data/seed-vehicles')
    
    if (seedIndex >= 0 && seedIndex < seedVehicles.length) {
      const seedVehicle = seedVehicles[seedIndex]
      vehicle = {
        ...seedVehicle,
        vehicle_photos: [],
        profiles: { full_name: 'Demo Dealer', phone: null },
      }
    } else {
      notFound()
    }
  } else {
    // Fetch vehicle details from database
    const result = await supabase
      .from('vehicles')
      .select('*, vehicle_photos(file_path), profiles!vehicles_dealer_id_fkey(full_name, phone)')
      .eq('id', id)
      .single()

    vehicle = result.data
    error = result.error
    
    if (error || !vehicle || vehicle.status !== 'active') {
      notFound()
    }
  }

  // Use image fallback system
  const { getVehicleDisplayImage } = await import('@/lib/images/getVehicleDisplayImage')
  const imageResult = await getVehicleDisplayImage(
    vehicle.id,
    vehicle.make,
    vehicle.model,
    vehicle.year
  )
  const imageUrl = imageResult.url

  // Generate JSON-LD for SEO
  const jsonLd = generateListingJsonLd(vehicle)

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        {/* Back Button */}
        <Link
          href="/listings"
          className="inline-flex items-center text-brand-blue dark:text-brand-blue-light hover:underline mb-4 xs:mb-6 text-sm xs:text-base"
        >
          ← Back to Listings
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-8 lg:gap-12">
          {/* Left Column - Images & Details */}
          <div>
            {/* Main Image */}
            <div className="aspect-video w-full bg-brand-gray/10 dark:bg-brand-navy rounded-xl overflow-hidden mb-4 relative">
              <img
                src={imageUrl}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
              {user && (
                <div className="absolute top-4 right-4">
                  <SaveButton vehicleId={vehicle.id} className="bg-white dark:bg-brand-navy-light shadow-lg" />
                </div>
              )}
            </div>

            {/* Additional Images */}
            {vehicle.vehicle_photos && vehicle.vehicle_photos.length > 1 && (
              <div className="grid grid-cols-2 fold:grid-cols-3 sm:grid-cols-4 gap-2">
                {vehicle.vehicle_photos.slice(1, 5).map((photo: any, idx: number) => (
                  <div key={idx} className="aspect-video bg-brand-gray/10 dark:bg-brand-navy rounded overflow-hidden">
                    <img
                      src={photo.file_path}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} - Image ${idx + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Recall Badge */}
            <div className="mt-6 xs:mt-8">
              <RecallBadge vehicleId={vehicle.id} />
            </div>

            {/* Vehicle Standing */}
            <div className="mt-4 xs:mt-6">
              <VehicleStandingCard vehicleId={vehicle.id} />
            </div>

            {/* Vehicle Details */}
            <div className="mt-6 xs:mt-8 bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 lg:p-8 border border-brand-white dark:border-brand-navy/50">
              <h2 className="text-xl xs:text-2xl lg:text-3xl font-bold text-brand-navy dark:text-brand-white mb-4 xs:mb-6">
                Vehicle Details
              </h2>
              <dl className="grid grid-cols-1 fold:grid-cols-2 gap-3 xs:gap-4">
                <div>
                  <dt className="text-sm font-medium text-brand-gray dark:text-brand-white/70">Make</dt>
                  <dd className="mt-1 text-brand-navy dark:text-brand-white">{vehicle.make}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-brand-gray dark:text-brand-white/70">Model</dt>
                  <dd className="mt-1 text-brand-navy dark:text-brand-white">{vehicle.model}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-brand-gray dark:text-brand-white/70">Year</dt>
                  <dd className="mt-1 text-brand-navy dark:text-brand-white">{vehicle.year}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-brand-gray dark:text-brand-white/70">Location</dt>
                  <dd className="mt-1 text-brand-navy dark:text-brand-white">{vehicle.location}</dd>
                </div>
                {vehicle.mileage_limit && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-brand-gray dark:text-brand-white/70">Mileage Limit</dt>
                    <dd className="mt-1 text-brand-navy dark:text-brand-white">
                      {vehicle.mileage_limit.toLocaleString()} miles per rental
                    </dd>
                  </div>
                )}
              </dl>

              {vehicle.description && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
                    Description
                  </h3>
                  <p className="text-brand-gray dark:text-brand-white/70">{vehicle.description}</p>
                </div>
              )}

              {/* Dealer Info */}
              {vehicle.profiles && (
                <div className="mt-6 pt-6 border-t border-brand-gray/20 dark:border-brand-navy/50">
                  <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
                    Listed by
                  </h3>
                  <p className="text-brand-gray dark:text-brand-white/70">
                    {vehicle.profiles.full_name || 'Dealer'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:sticky lg:top-8 xl:top-12 lg:h-fit">
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 lg:p-8 border border-brand-white dark:border-brand-navy/50">
              <div className="mb-4 xs:mb-6">
                <h1 className="text-2xl xs:text-3xl lg:text-4xl font-bold text-brand-navy dark:text-brand-white mb-2">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                <p className="text-xl xs:text-2xl lg:text-3xl font-bold text-brand-blue dark:text-brand-blue-light">
                  {formatCurrency(vehicle.price_per_day)}
                  <span className="text-base xs:text-lg font-normal text-brand-gray dark:text-brand-white/70">/day</span>
                </p>
              </div>

              {user ? (
                <BookingForm
                  vehicleId={vehicle.id}
                  pricePerDay={vehicle.price_per_day}
                  defaultStartDate={queryParams.start_date}
                  defaultEndDate={queryParams.end_date}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-brand-gray dark:text-brand-white/70 mb-4">
                    Sign in to book this vehicle
                  </p>
                  <Link
                    href={`/auth?redirect=/listings/${vehicle.id}`}
                    className="inline-block px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium"
                  >
                    Sign In to Book
                  </Link>
                  <p className="text-sm text-brand-gray dark:text-brand-white/50 mt-4">
                    Or continue browsing as a guest
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}