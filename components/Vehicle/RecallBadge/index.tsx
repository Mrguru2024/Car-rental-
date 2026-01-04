'use client'

import { useEffect, useState } from 'react'

interface RecallBadgeProps {
  vehicleId: string
  className?: string
}

interface BadgeData {
  color: 'green' | 'yellow' | 'red' | 'gray'
  label: string
  recallCount: number
  severity: 'none' | 'info' | 'caution' | 'urgent'
}

export default function RecallBadge({ vehicleId, className = '' }: RecallBadgeProps) {
  const [badge, setBadge] = useState<BadgeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  useEffect(() => {
    const fetchBadge = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/vehicle/recalls?vehicleId=${encodeURIComponent(vehicleId)}`)

        if (!response.ok) {
          if (response.status === 429) {
            setError('Rate limit exceeded')
            return
          }
          throw new Error('Failed to fetch recall data')
        }

        // Check Content-Type header before parsing JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Expected JSON response but got:', contentType)
          return
        }

        const data = await response.json()
        setBadge({
          color: data.badge.color,
          label: data.badge.label,
          recallCount: data.badge.recallCount,
          severity: data.badge.severity,
        })
        setFetchedAt(data.fetchedAt)
      } catch (err) {
        console.error('Error fetching recall badge:', err)
        setError('Unable to load recall information')
      } finally {
        setLoading(false)
      }
    }

    fetchBadge()
  }, [vehicleId])

  if (loading) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ${className}`}>
        Loading...
      </div>
    )
  }

  if (error || !badge) {
    return null // Fail silently - don't show error to users
  }

  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  }

  const tooltipText = fetchedAt
    ? `Source: NHTSA. Last updated: ${new Date(fetchedAt).toLocaleDateString()}`
    : 'Source: NHTSA'

  return (
    <div
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClasses[badge.color]} ${className}`}
      title={tooltipText}
      role="status"
      aria-label={`Recall status: ${badge.label}. ${badge.recallCount} recall${badge.recallCount !== 1 ? 's' : ''} found.`}
    >
      <span className="sr-only">Recall status: </span>
      {badge.label}
      {badge.recallCount > 0 && (
        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-xs font-semibold">
          {badge.recallCount}
        </span>
      )}
    </div>
  )
}
