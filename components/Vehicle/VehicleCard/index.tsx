import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'
import { getVehicleDisplayImageClient } from '@/lib/images/getVehicleDisplayImageClient'

interface VehicleCardProps {
  vehicle: {
    id: string
    make: string
    model: string
    year: number
    price_per_day: number
    location: string
    mileage_limit?: number | null
    status: string
    vehicle_photos?: Array<{ file_path: string }>
  }
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  // Use client-side image fallback (works in both server and client components)
  const imageResult = getVehicleDisplayImageClient(vehicle.vehicle_photos)
  const imageUrl = imageResult.url

  return (
    <Link href={`/listings/${vehicle.id}`}>
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 overflow-hidden border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow">
        <div className="aspect-video w-full bg-brand-gray/10 dark:bg-brand-navy relative">
          <img
            src={imageUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
          />
          {vehicle.status === 'active' && (
            <span className="absolute top-2 right-2 px-2 py-1 bg-brand-green text-white text-xs font-semibold rounded">
              Available
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <h3 className="text-lg sm:text-xl font-bold text-brand-navy dark:text-brand-white mb-1">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-brand-gray dark:text-brand-white/70 text-xs sm:text-sm mb-2">{vehicle.location}</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2">
            <p className="text-xl sm:text-2xl font-bold text-brand-blue dark:text-brand-blue-light">
              {formatCurrency(vehicle.price_per_day)}
              <span className="text-xs sm:text-sm font-normal text-brand-gray dark:text-brand-white/70">/day</span>
            </p>
            {vehicle.mileage_limit && (
              <p className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70">
                {vehicle.mileage_limit.toLocaleString()} mi limit
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}