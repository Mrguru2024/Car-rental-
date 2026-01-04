'use client'

import { useEffect, useState } from 'react'

interface RecallDetailsModalProps {
  vehicleId: string
  recalls: Array<{
    campaignNumber: string
    make: string
    model: string
    modelYear: string
    component: string
    summary: string
    consequence: string
    remedy: string
  }>
  onClose: () => void
}

export default function RecallDetailsModal({
  vehicleId,
  recalls: initialRecalls,
  onClose,
}: RecallDetailsModalProps) {
  const [recalls, setRecalls] = useState(initialRecalls)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Fetch fresh data if needed
  useEffect(() => {
    const fetchRecalls = async () => {
      try {
        const response = await fetch(`/api/vehicle/recalls?vehicleId=${encodeURIComponent(vehicleId)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.recalls) {
            setRecalls(data.recalls)
          }
        }
      } catch (err) {
        console.error('Error fetching recalls:', err)
      }
    }

    // Only fetch if we don't have recalls
    if (recalls.length === 0) {
      fetchRecalls()
    }
  }, [vehicleId, recalls.length])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recall-modal-title"
    >
      <div
        className="bg-white dark:bg-brand-navy-light rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 xs:p-6 border-b border-brand-gray/20 dark:border-brand-navy/50">
          <h2
            id="recall-modal-title"
            className="text-xl xs:text-2xl font-bold text-brand-navy dark:text-brand-white"
          >
            Safety Recalls & Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white rounded-lg hover:bg-gray-100 dark:hover:bg-brand-navy transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 xs:p-6">
          {recalls.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
                No Recalls Found
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                No safety recalls have been reported for this vehicle according to NHTSA records.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Source:</strong> National Highway Traffic Safety Administration (NHTSA)
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  This information is provided for transparency. Always verify vehicle condition and
                  recall status directly with the manufacturer or dealer before booking.
                </p>
              </div>

              {recalls.map((recall, index) => (
                <div
                  key={recall.campaignNumber}
                  className="border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="w-full p-4 text-left bg-gray-50 dark:bg-brand-navy hover:bg-gray-100 dark:hover:bg-brand-navy/80 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                          Recall
                        </span>
                        <span className="text-xs text-brand-gray dark:text-brand-white/70">
                          Campaign #{recall.campaignNumber}
                        </span>
                      </div>
                      <h3 className="font-semibold text-brand-navy dark:text-brand-white">
                        {recall.component}
                      </h3>
                      {recall.summary && (
                        <p className="text-sm text-brand-gray dark:text-brand-white/70 mt-1 line-clamp-2">
                          {recall.summary}
                        </p>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-brand-gray dark:text-brand-white/70 transition-transform ${
                        expandedIndex === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedIndex === index && (
                    <div className="p-4 space-y-4 bg-white dark:bg-brand-navy-light">
                      {recall.summary && (
                        <div>
                          <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-1">
                            Summary
                          </h4>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70">
                            {recall.summary}
                          </p>
                        </div>
                      )}

                      {recall.consequence && (
                        <div>
                          <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-1">
                            Consequence
                          </h4>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70">
                            {recall.consequence}
                          </p>
                        </div>
                      )}

                      {recall.remedy && (
                        <div>
                          <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-1">
                            Remedy
                          </h4>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70">
                            {recall.remedy}
                          </p>
                        </div>
                      )}

                      <div className="pt-4 border-t border-brand-gray/20 dark:border-brand-navy/50">
                        <a
                          href={`https://www.nhtsa.gov/recalls?nhtsaId=${recall.campaignNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-brand-blue dark:text-brand-blue-light hover:underline"
                        >
                          Learn more on NHTSA.gov
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 xs:p-6 border-t border-brand-gray/20 dark:border-brand-navy/50 bg-gray-50 dark:bg-brand-navy">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
