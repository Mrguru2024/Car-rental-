'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ReviewFormProps {
  bookingId: string
  vehicleId: string
}

export default function ReviewForm({ bookingId, vehicleId }: ReviewFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [vehicleRating, setVehicleRating] = useState(0)
  const [dealerRating, setDealerRating] = useState(0)
  const [vehicleReview, setVehicleReview] = useState('')
  const [dealerReview, setDealerReview] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (vehicleRating === 0 || dealerRating === 0) {
      setError('Please provide ratings for both vehicle and dealer')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          vehicle_rating: vehicleRating,
          dealer_rating: dealerRating,
          vehicle_review: vehicleReview || null,
          dealer_review: dealerReview || null,
        }),
      })

      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please sign in to submit reviews')
        }
        throw new Error('Unexpected response from server')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const StarRating = ({
    rating,
    setRating,
    label,
  }: {
    rating: number
    setRating: (rating: number) => void
    label: string
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
        {label} Rating *
      </label>
      <div className="flex gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-2xl sm:text-3xl p-1 sm:p-2 transition-colors touch-manipulation ${
              star <= rating
                ? 'text-yellow-400'
                : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
            }`}
            aria-label={`Rate ${star} out of 5 stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <StarRating rating={vehicleRating} setRating={setVehicleRating} label="Vehicle" />
      <StarRating rating={dealerRating} setRating={setDealerRating} label="Dealer" />

      <div>
        <label
          htmlFor="vehicle_review"
          className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
        >
          Vehicle Review (Optional)
        </label>
        <textarea
          id="vehicle_review"
          value={vehicleReview}
          onChange={(e) => setVehicleReview(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          placeholder="Share your experience with this vehicle..."
        />
      </div>

      <div>
        <label
          htmlFor="dealer_review"
          className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
        >
          Dealer Review (Optional)
        </label>
        <textarea
          id="dealer_review"
          value={dealerReview}
          onChange={(e) => setDealerReview(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          placeholder="Share your experience with this dealer..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-6 py-2.5 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
