'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast/ToastProvider'

interface SaveButtonProps {
  vehicleId: string
  className?: string
}

export default function SaveButton({ vehicleId, className = '' }: SaveButtonProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if vehicle is saved
    const checkSaved = async () => {
      try {
        const response = await fetch(`/api/saved-vehicles/toggle?vehicle_id=${vehicleId}`)
        const contentType = response.headers.get('content-type')
        
        if (response.ok && contentType && contentType.includes('application/json')) {
          const data = await response.json()
          setSaved(data.saved)
        } else if (response.status === 401 || response.status === 403) {
          // User not authenticated or not authorized - just don't show saved state
          setSaved(false)
        }
      } catch (error) {
        console.error('Error checking saved status:', error)
      } finally {
        setChecking(false)
      }
    }

    checkSaved()
  }, [vehicleId])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setLoading(true)

    try {
      const response = await fetch('/api/saved-vehicles/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId }),
      })

      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, likely a redirect or error page
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
      }
    } catch (error: any) {
      console.error('Error toggling save:', error)
      if (error.message?.includes('sign in')) {
        showToast('Please sign in to save vehicles', 'error')
      } else {
        showToast(error.message || 'Failed to update saved status', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return null
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 sm:p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-50 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${className}`}
      aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
      title={saved ? 'Remove from saved' : 'Save vehicle'}
    >
      <svg
        className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
          saved
            ? 'text-red-500 fill-current'
            : 'text-gray-400 dark:text-gray-500 hover:text-red-400'
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
    </button>
  )
}
