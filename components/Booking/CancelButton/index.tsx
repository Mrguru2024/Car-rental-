'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CancelButtonProps {
  bookingId: string
  bookingStatus: string
  startDate: string
}

export default function CancelButton({ bookingId, bookingStatus, startDate }: CancelButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // Check if booking can be canceled
  const canCancel = bookingStatus === 'confirmed' || bookingStatus === 'pending_payment'
  const startDateObj = new Date(startDate)
  const now = new Date()
  const hoursUntilStart = (startDateObj.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (!canCancel) {
    return null
  }

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          reason: reason.trim(),
        }),
      })

      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please sign in to cancel bookings')
        }
        throw new Error('Unexpected response from server')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRefundInfo = () => {
    if (hoursUntilStart >= 48) {
      return { text: 'Full refund', color: 'text-brand-green' }
    } else if (hoursUntilStart >= 24) {
      return { text: '50% refund', color: 'text-yellow-600' }
    } else {
      return { text: 'No refund', color: 'text-red-600' }
    }
  }

  const refundInfo = getRefundInfo()

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm font-medium touch-manipulation min-h-[44px]"
      >
        Cancel Booking
      </button>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div>
        <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
          Cancellation Policy
        </p>
        <p className={`text-sm font-semibold ${refundInfo.color} mb-1`}>
          {refundInfo.text} if canceled now
        </p>
        <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
          <li>48+ hours before: Full refund</li>
          <li>24-48 hours before: 50% refund</li>
          <li>Less than 24 hours: No refund</li>
        </ul>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
          Reason for cancellation *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          placeholder="Please tell us why you're canceling..."
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleCancel}
          disabled={loading || !reason.trim()}
          className="px-4 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
        >
          {loading ? 'Canceling...' : 'Confirm Cancellation'}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false)
            setReason('')
            setError('')
          }}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium touch-manipulation min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
