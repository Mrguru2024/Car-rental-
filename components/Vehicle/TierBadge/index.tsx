'use client'

import { getTierDisplayName, getTierYearRange, type VehicleTier } from '@/lib/vehicle-tiers'

interface TierBadgeProps {
  tier: VehicleTier
  className?: string
  showYearRange?: boolean
}

export default function TierBadge({ tier, className = '', showYearRange = false }: TierBadgeProps) {
  const tierColors: Record<VehicleTier, string> = {
    tier1: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700',
    tier2: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    tier3: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
    tier4: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${tierColors[tier]}`}
      >
        {tier.toUpperCase()}
      </span>
      <span className="text-sm text-brand-gray dark:text-brand-white/70">
        {getTierDisplayName(tier)}
      </span>
      {showYearRange && (
        <span className="text-xs text-brand-gray dark:text-brand-white/50">
          ({getTierYearRange(tier)})
        </span>
      )}
    </div>
  )
}
