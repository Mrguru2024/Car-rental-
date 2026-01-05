'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VehicleCard from '@/components/Vehicle/VehicleCard'
import { useToast } from '@/components/Toast/ToastProvider'

interface SavedVehiclesClientProps {
  vehicle: any
}

export default function SavedVehiclesClient({ vehicle }: SavedVehiclesClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)

    try {
      const response = await fetch('/api/saved-vehicles/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicle.id }),
      })

      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please sign in to save vehicles')
        }
        throw new Error('Unexpected response from server')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update saved status')
      }

      setSaved(data.saved)
      if (data.saved) {
        showToast('Vehicle saved to favorites', 'success')
      } else {
        showToast('Vehicle removed from favorites', 'success')
        // Refresh page to remove from list
        setTimeout(() => {
          router.refresh()
        }, 500)
      }
    } catch (error: any) {
      console.error('Error toggling save:', error)
      showToast(error.message || 'Failed to update saved status', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative group">
      <VehicleCard vehicle={vehicle} />
      <button
        onClick={handleToggleSave}
        disabled={loading}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-white dark:bg-brand-navy-light rounded-full shadow-lg hover:shadow-xl active:shadow-md transition-all disabled:opacity-50 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center z-10 hover:scale-110 active:scale-95"
        aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
        title={saved ? 'Remove from favorites' : 'Add to favorites'}
      >
        {loading ? (
          <svg className="animate-spin w-5 h-5 sm:w-6 sm:h-6 text-brand-gray dark:text-brand-white/70" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${
              saved
                ? 'text-red-500 fill-current'
                : 'text-gray-400 dark:text-gray-500 group-hover:text-red-400'
            }`}
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
