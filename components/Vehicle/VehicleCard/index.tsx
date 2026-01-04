import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'
import { getVehicleDisplayImageClient } from '@/lib/images/getVehicleDisplayImageClient'
import SaveButton from '../SaveButton'
import RecallBadge from '../RecallBadge'

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
  // Use pre-fetched image if available (for placeholder vehicles with server-side image fetch)
  // Otherwise use client-side image fallback
  const imageUrl = (vehicle as any)._displayImage 
    ? (vehicle as any)._displayImage 
    : getVehicleDisplayImageClient(vehicle.vehicle_photos).url

  return (
    <Link href={`/listings/${vehicle.id}`}>
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 overflow-hidden border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow">
        <div className="aspect-video w-full bg-brand-gray/10 dark:bg-brand-navy relative">
          <img
            src={imageUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <SaveButton vehicleId={vehicle.id} className="bg-white dark:bg-brand-navy-light shadow-lg" />
            {vehicle.status === 'active' && (
              <span className="px-2 py-1 bg-brand-green text-white text-xs font-semibold rounded">
                Available
              </span>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-lg sm:text-xl font-bold text-brand-navy dark:text-brand-white flex-1">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <RecallBadge vehicleId={vehicle.id} className="shrink-0" />
          </div>
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