'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/format'
import { useToast } from '@/components/Toast/ToastProvider'

interface BookingFormProps {
  vehicleId: string
  pricePerDay: number
  defaultStartDate?: string
  defaultEndDate?: string
}

export default function BookingForm({
  vehicleId,
  pricePerDay,
  defaultStartDate,
  defaultEndDate,
}: BookingFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(defaultStartDate || '')
  const [endDate, setEndDate] = useState(defaultEndDate || '')

  const calculateTotal = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 0
    const subtotal = diffDays * pricePerDay
    const platformFee = subtotal * 0.1 // 10% platform fee
    return subtotal + platformFee
  }

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) {
      showToast('Please select start and end dates', 'error')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
      showToast('End date must be after start date', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          start_date: startDate,
          end_date: endDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      router.push(`/bookings/${data.booking_id}/checkout`)
    } catch (error: any) {
      showToast(error.message || 'Failed to create booking', 'error')
      setLoading(false)
    }
  }

  const days = calculateDays()
  const subtotal = days * pricePerDay
  const platformFee = subtotal * 0.1
  const total = calculateTotal()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="start_date" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Start Date
        </label>
        <input
          id="start_date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
          className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
        />
      </div>

      <div>
        <label htmlFor="end_date" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          End Date
        </label>
        <input
          id="end_date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min={startDate || new Date().toISOString().split('T')[0]}
          required
          className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
        />
      </div>

      {days > 0 && (
        <div className="border-t border-brand-gray/20 dark:border-brand-navy/50 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray dark:text-brand-white/70">
              {formatCurrency(pricePerDay)} × {days} {days === 1 ? 'day' : 'days'}
            </span>
            <span className="text-brand-navy dark:text-brand-white">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray dark:text-brand-white/70">Platform fee (10%)</span>
            <span className="text-brand-navy dark:text-brand-white">{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-brand-gray/20 dark:border-brand-navy/50">
            <span className="text-brand-navy dark:text-brand-white">Total</span>
            <span className="text-brand-blue dark:text-brand-blue-light">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !startDate || !endDate}
        className="w-full px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : 'Continue to Payment'}
      </button>
    </form>
  )
}