'use client'

import { useEffect, useState } from 'react'
import RecallDetailsModal from '../RecallDetailsModal'

interface VehicleStandingProps {
  vehicleId: string
  className?: string
}

interface StandingData {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  reasons: string[]
}

interface RecallsData {
  campaignNumber: string
  make: string
  model: string
  modelYear: string
  component: string
  summary: string
  consequence: string
  remedy: string
}

export default function VehicleStandingCard({ vehicleId, className = '' }: VehicleStandingProps) {
  const [standing, setStanding] = useState<StandingData | null>(null)
  const [recalls, setRecalls] = useState<RecallsData[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const fetchStanding = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/vehicle/recalls?vehicleId=${encodeURIComponent(vehicleId)}`)

        if (!response.ok) {
          return // Fail silently
        }

        // Check Content-Type header before parsing JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Expected JSON response but got:', contentType)
          return
        }

        const data = await response.json()
        if (data.standing) {
          setStanding({
            score: data.standing.score,
            grade: data.standing.grade,
            reasons: data.standing.reasons || [],
          })
        }
        if (data.recalls) {
          setRecalls(data.recalls)
        }
      } catch (err) {
        console.error('Error fetching vehicle standing:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStanding()
  }, [vehicleId])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!standing) {
    return null // Fail silently
  }

  const gradeColors = {
    A: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
    B: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    C: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    D: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    F: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
  }

  return (
    <>
      <div className={`bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50 ${className}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
              Vehicle Standing
            </h3>
            <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-4">
              This is a credibility indicator based on available information, not a guarantee.
            </p>
          </div>
          <div
            className={`flex items-center justify-center w-16 h-16 rounded-full border-4 font-bold text-2xl ${gradeColors[standing.grade]}`}
            aria-label={`Vehicle standing grade: ${standing.grade}`}
          >
            {standing.grade}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-brand-gray dark:text-brand-white/70">Score</span>
            <span className="text-lg font-semibold text-brand-navy dark:text-brand-white">
              {standing.score}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                standing.score >= 90
                  ? 'bg-green-500'
                  : standing.score >= 80
                    ? 'bg-blue-500'
                    : standing.score >= 70
                      ? 'bg-yellow-500'
                      : standing.score >= 60
                        ? 'bg-orange-500'
                        : 'bg-red-500'
              }`}
              style={{ width: `${standing.score}%` }}
              role="progressbar"
              aria-valuenow={standing.score}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {standing.reasons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-2">
              Factors
            </h4>
            <ul className="space-y-1">
              {standing.reasons.slice(0, 5).map((reason, idx) => (
                <li
                  key={idx}
                  className="text-sm text-brand-gray dark:text-brand-white/70 flex items-start"
                >
                  <span className="mr-2">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recalls.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full mt-4 px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium text-sm"
          >
            View Safety Details ({recalls.length} recall{recalls.length !== 1 ? 's' : ''})
          </button>
        )}

        <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-4">
          Information provided for transparency. Always verify vehicle condition before booking.
        </p>
      </div>

      {showModal && (
        <RecallDetailsModal
          vehicleId={vehicleId}
          recalls={recalls}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
