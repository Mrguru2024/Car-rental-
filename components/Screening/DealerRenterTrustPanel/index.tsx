/**
 * Dealer Renter Trust Panel
 * Shows screening badges for a renter (visible to dealers on booking requests)
 */

'use client'

import ScreeningStatusPill from '../ScreeningStatusPill'

interface ScreeningSummary {
  mvr?: {
    status: string
    result?: 'pass' | 'conditional' | 'fail'
    risk_level?: string
  }
  soft_credit?: {
    status: string
    result?: 'pass' | 'conditional' | 'fail'
    risk_level?: string
  }
}

interface DealerRenterTrustPanelProps {
  renterId: string
  bookingId?: string | null
  screeningSummary?: ScreeningSummary
  className?: string
}

export default function DealerRenterTrustPanel({
  screeningSummary,
  className = '',
}: DealerRenterTrustPanelProps) {
  if (!screeningSummary) {
    return (
      <div className={`bg-gray-50 dark:bg-brand-navy/50 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-brand-gray dark:text-brand-white/70">
          No screening information available
        </p>
      </div>
    )
  }

  const hasMvr = !!screeningSummary.mvr
  const hasCredit = !!screeningSummary.soft_credit

  if (!hasMvr && !hasCredit) {
    return (
      <div className={`bg-gray-50 dark:bg-brand-navy/50 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-brand-gray dark:text-brand-white/70">
          Screening checks not yet completed
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-brand-navy-light rounded-lg border border-brand-gray/20 dark:border-brand-navy/50 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-3">
        Renter Screening Status
      </h3>
      <div className="flex flex-wrap gap-2">
        {hasMvr && (
          <div className="flex items-center gap-2">
            <ScreeningStatusPill
              result={screeningSummary.mvr?.result}
              status={screeningSummary.mvr?.status}
              screeningType="mvr"
            />
          </div>
        )}
        {hasCredit && (
          <div className="flex items-center gap-2">
            <ScreeningStatusPill
              result={screeningSummary.soft_credit?.result}
              status={screeningSummary.soft_credit?.status}
              screeningType="soft_credit"
            />
          </div>
        )}
      </div>
      {(hasMvr || hasCredit) && (
        <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-3">
          Screening results help assess renter eligibility. Contact support for details.
        </p>
      )}
    </div>
  )
}
