'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useToast } from '@/components/Toast/ToastProvider'
import { loadStripe } from '@stripe/stripe-js'

interface CheckoutClientProps {
  booking: any
}

export default function CheckoutClient({ booking }: CheckoutClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
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
  const subtotal = diffDays * vehicle.price_per_day
  const platformFee = booking.total_price - subtotal

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to start checkout', 'error')
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
                {formatDate(booking.start_date)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-gray dark:text-brand-white/70">Return Date</dt>
              <dd className="text-brand-navy dark:text-brand-white font-medium">
                {formatDate(booking.end_date)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-gray dark:text-brand-white/70">Duration</dt>
              <dd className="text-brand-navy dark:text-brand-white font-medium">
                {diffDays} {diffDays === 1 ? 'day' : 'days'}
              </dd>
            </div>
          </dl>
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
                {formatCurrency(vehicle.price_per_day)} × {diffDays} {diffDays === 1 ? 'day' : 'days'}
              </span>
              <span className="text-brand-navy dark:text-brand-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray dark:text-brand-white/70">Platform fee (10%)</span>
              <span className="text-brand-navy dark:text-brand-white">{formatCurrency(platformFee)}</span>
            </div>
            <div className="pt-3 border-t border-brand-gray/20 dark:border-brand-navy/50">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-brand-navy dark:text-brand-white">Total</span>
                <span className="text-brand-blue dark:text-brand-blue-light">
                  {formatCurrency(booking.total_price)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>

          <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-4 text-center">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}