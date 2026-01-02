'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface ReviewClientProps {
  booking: any
  election: any
  liabilityAcceptance: any
}

export default function ReviewClient({ booking, election, liabilityAcceptance }: ReviewClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const vehicle = booking.vehicles
  const imageUrl =
    vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
      ? vehicle.vehicle_photos[0].file_path
      : `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`

  const startDate = new Date(booking.start_date)
  const endDate = new Date(booking.end_date)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Calculate rental base (total_price includes platform fee, so we need to calculate base)
  // Assuming 10% platform fee structure
  const rentalBase = booking.total_price / 1.1
  const platformFee = rentalBase * 0.1
  const planFee = booking.plan_fee_cents / 100
  const total = rentalBase + platformFee + planFee

  const handleProceedToPayment = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error: any) {
      alert(error.message || 'Failed to proceed to payment')
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Booking Summary */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Booking Summary
          </h2>

          <div className="flex gap-4 mb-6">
            <div className="w-32 h-24 bg-brand-gray/10 dark:bg-brand-navy rounded overflow-hidden flex-shrink-0">
              <img
                src={imageUrl}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-sm text-brand-gray dark:text-brand-white/70">{vehicle.location}</p>
            </div>
          </div>

          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-brand-gray dark:text-brand-white/70">Pick-up Date</dt>
              <dd className="text-brand-navy dark:text-brand-white font-medium">
                {formatDate(startDate)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-gray dark:text-brand-white/70">Drop-off Date</dt>
              <dd className="text-brand-navy dark:text-brand-white font-medium">{formatDate(endDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-gray dark:text-brand-white/70">Duration</dt>
              <dd className="text-brand-navy dark:text-brand-white font-medium">
                {diffDays} {diffDays === 1 ? 'day' : 'days'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Coverage Summary */}
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Coverage Selection
          </h2>

          {election.coverage_type === 'platform_plan' && election.protection_plans && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-brand-gray dark:text-brand-white/70">Protection Plan:</span>
                <span className="text-brand-navy dark:text-brand-white font-medium">
                  {election.protection_plans.display_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-gray dark:text-brand-white/70">Deductible:</span>
                <span className="text-brand-navy dark:text-brand-white font-medium">
                  {formatCurrency(election.deductible_cents / 100)}
                </span>
              </div>
            </div>
          )}

          {election.coverage_type === 'byoi' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-brand-gray dark:text-brand-white/70">Coverage Type:</span>
                <span className="text-brand-navy dark:text-brand-white font-medium">
                  Bring Your Own Insurance
                </span>
              </div>
              {election.byoi_documents && (
                <>
                  <div className="flex justify-between">
                    <span className="text-brand-gray dark:text-brand-white/70">Policyholder:</span>
                    <span className="text-brand-navy dark:text-brand-white font-medium">
                      {election.byoi_documents.policyholder_name}
                    </span>
                  </div>
                  {election.byoi_documents.insurer_name && (
                    <div className="flex justify-between">
                      <span className="text-brand-gray dark:text-brand-white/70">Insurer:</span>
                      <span className="text-brand-navy dark:text-brand-white font-medium">
                        {election.byoi_documents.insurer_name}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-brand-gray/20 dark:border-brand-navy/50">
                    <p className="text-xs text-brand-gray dark:text-brand-white/70">
                      ✓ Liability acceptance confirmed
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 sticky top-8">
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Payment Summary
          </h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray dark:text-brand-white/70">
                {formatCurrency(vehicle.price_per_day / 100)} × {diffDays}{' '}
                {diffDays === 1 ? 'day' : 'days'}
              </span>
              <span className="text-brand-navy dark:text-brand-white">
                {formatCurrency(rentalBase)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray dark:text-brand-white/70">Platform fee (10%)</span>
              <span className="text-brand-navy dark:text-brand-white">{formatCurrency(platformFee)}</span>
            </div>
            {planFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-gray dark:text-brand-white/70">Protection Plan Fee</span>
                <span className="text-brand-navy dark:text-brand-white">{formatCurrency(planFee)}</span>
              </div>
            )}
            <div className="pt-3 border-t border-brand-gray/20 dark:border-brand-navy/50">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-brand-navy dark:text-brand-white">Total</span>
                <span className="text-brand-blue dark:text-brand-blue-light">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleProceedToPayment}
            disabled={loading}
            className="w-full px-6 py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>

          <button
            onClick={() => router.push(`/checkout/${booking.id}/coverage`)}
            className="w-full mt-3 px-6 py-3 border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white font-semibold rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50 transition-colors"
          >
            Back to Coverage
          </button>
        </div>
      </div>
    </div>
  )
}