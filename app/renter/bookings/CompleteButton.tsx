'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CompleteButtonProps {
  bookingId: string
  bookingStatus: string
  endDate: string
}

export default function CompleteButton({ bookingId, bookingStatus, endDate }: CompleteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Only show for confirmed bookings
  if (bookingStatus !== 'confirmed') {
    return null
  }

  const endDateObj = new Date(endDate)
  const now = new Date()
  const hoursUntilEnd = (endDateObj.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Only allow completion if end date has passed or within 24 hours before
  if (hoursUntilEnd > 24) {
    return null
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/bookings/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })

      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please sign in to complete bookings')
        }
        throw new Error('Unexpected response from server')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete booking')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
      <button
        onClick={handleComplete}
        disabled={loading}
        className="px-4 py-2.5 bg-brand-green dark:bg-brand-green-light text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
      >
        {loading ? 'Completing...' : 'Mark as Completed'}
      </button>
    </div>
  )
}
