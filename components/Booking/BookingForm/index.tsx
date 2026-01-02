'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'
import { useToast } from '@/components/Toast/ToastProvider'
import { createClient } from '@/lib/supabase/client'

interface BookingFormProps {
  readonly vehicleId: string
  readonly pricePerDay: number
  readonly defaultStartDate?: string
  readonly defaultEndDate?: string
}

export default function BookingForm({
  vehicleId,
  pricePerDay,
  defaultStartDate,
  defaultEndDate,
}: BookingFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(defaultStartDate || '')
  const [endDate, setEndDate] = useState(defaultEndDate || '')
  const [profile, setProfile] = useState<any>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)

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

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('role, verification_status')
            .eq('user_id', user.id)
            .maybeSingle()
          setProfile(userProfile)
        }
      } catch (error) {
        console.error('Error checking profile:', error)
      } finally {
        setCheckingProfile(false)
      }
    }
    checkProfile()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user has completed onboarding
    if (!profile) {
      showToast('Please complete onboarding to book vehicles', 'error')
      router.push('/onboarding')
      return
    }

    if (profile.role !== 'renter') {
      showToast('Only renters can book vehicles', 'error')
      return
    }

    // Require verification approval before booking
    // Users can browse and submit verification, but cannot book until approved
    if (profile.verification_status !== 'approved') {
      if (profile.verification_status === 'rejected') {
        showToast('Your verification was rejected. Please contact support or resubmit your verification documents.', 'error')
        router.push('/renter/verification')
        return
      }
      // Pending or no verification status
      showToast('Please complete verification and wait for approval before booking. Verification typically takes up to 48 hours.', 'error')
      router.push('/renter/verification')
      return
    }

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

      {(() => {
        if (checkingProfile) {
          return (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
            </div>
          )
        }

        if (!profile) {
          return (
            <div className="text-center py-4 space-y-4">
              <p className="text-brand-gray dark:text-brand-white/70">
                Please complete onboarding to book this vehicle
              </p>
              <Link
                href="/onboarding"
                className="inline-block w-full px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium"
              >
                Complete Onboarding
              </Link>
            </div>
          )
        }

        if (profile.role !== 'renter') {
          return (
            <div className="text-center py-4">
              <p className="text-brand-gray dark:text-brand-white/70 mb-4">
                Only renters can book vehicles. Switch to renter account to continue.
              </p>
              <Link
                href="/onboarding"
                className="inline-block px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium"
              >
                Update Profile
              </Link>
            </div>
          )
        }

        // Require verification approval before booking
        // Users can browse and submit verification, but cannot book until approved
        if (profile.verification_status !== 'approved') {
          let message = 'Please complete verification and wait for approval before booking.'
          let linkText = 'Complete Verification'
          
          if (profile.verification_status === 'rejected') {
            message = 'Your verification was rejected. Please contact support or resubmit your verification documents.'
            linkText = 'Review Verification'
          } else if (profile.verification_status === 'pending') {
            message = 'Your verification is being reviewed. Please wait for approval before booking. Verification typically takes up to 48 hours.'
            linkText = 'View Verification Status'
          } else {
            message = 'Please complete verification before booking. Verification typically takes up to 48 hours.'
          }

          return (
            <div className="text-center py-4 space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  {message}
                </p>
                <Link
                  href="/renter/verification"
                  className="inline-block px-6 py-3 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors font-medium text-sm"
                >
                  {linkText}
                </Link>
              </div>
            </div>
          )
        }

        // At this point, verification_status is 'approved'
        return (
          <button
            type="submit"
            disabled={loading || !startDate || !endDate}
            className="w-full px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        )
      })()}
    </form>
  )
}