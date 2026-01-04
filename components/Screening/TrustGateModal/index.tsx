/**
 * Trust Gate Modal Component
 * Displays policy consent and blocks actions until accepted
 */

'use client'

import { useState } from 'react'
import { useToast } from '@/components/Toast/ToastProvider'
import { SCREENING_POLICIES } from '@/lib/screening/policies'

interface TrustGateModalProps {
  policyKey: 'renter_mvr_consent_v1' | 'renter_soft_credit_consent_v1'
  bookingId?: string | null
  onAccept: () => void
  onClose?: () => void
  open: boolean
}

export default function TrustGateModal({
  policyKey,
  bookingId,
  onAccept,
  onClose,
  open,
}: TrustGateModalProps) {
  const { showToast } = useToast()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const policy = SCREENING_POLICIES[policyKey]
  if (!policy) {
    console.error(`Policy ${policyKey} not found`)
    return null
  }

  const handleAccept = async () => {
    if (!accepted) {
      showToast('Please check the box to accept the policy', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/screenings/policy/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_key: policy.key,
          policy_version: policy.version,
          consent_type: policyKey.includes('mvr') ? 'mvr' : 'soft_credit',
          booking_id: bookingId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept policy')
      }

      onAccept()
    } catch (error: any) {
      showToast(error.message || 'Failed to accept policy', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trust-gate-modal-title"
    >
      <div
        className="bg-white dark:bg-brand-navy-light rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 xs:p-6 border-b border-brand-gray/20 dark:border-brand-navy/50">
          <h2
            id="trust-gate-modal-title"
            className="text-xl xs:text-2xl font-bold text-brand-navy dark:text-brand-white"
          >
            {policy.title}
          </h2>
          {onClose && (
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
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 xs:p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-line text-brand-navy dark:text-brand-white">
              {policy.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 xs:p-6 border-t border-brand-gray/20 dark:border-brand-navy/50 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 text-brand-blue border-brand-gray/30 rounded focus:ring-brand-blue focus:ring-2"
            />
            <span className="text-sm text-brand-navy dark:text-brand-white">
              I have read and accept the terms above
            </span>
          </label>

          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleAccept}
              disabled={!accepted || loading}
              className="flex-1 px-4 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Accept & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
