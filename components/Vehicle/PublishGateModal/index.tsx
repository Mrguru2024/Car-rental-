'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast/ToastProvider'

interface PublishGateModalProps {
  vehicleId: string
  isOpen: boolean
  onClose: () => void
  onAccept: () => Promise<void>
  validationErrors?: string[]
}

export default function PublishGateModal({
  vehicleId,
  isOpen,
  onClose,
  onAccept,
  validationErrors = [],
}: PublishGateModalProps) {
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  if (!isOpen) return null

  const handleAccept = async () => {
    if (!accepted) {
      showToast('Please confirm that you understand the requirements', 'error')
      return
    }

    if (validationErrors.length > 0) {
      showToast('Please fix validation errors before publishing', 'error')
      return
    }

    setAccepting(true)
    try {
      // Record policy acceptance
      const response = await fetch('/api/policies/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_key: 'dealer_listing_requirements_v1',
          context_type: 'vehicle',
          context_id: vehicleId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record acceptance')
      }

      await onAccept()
      onClose()
    } catch (error: any) {
      showToast(error.message || 'Failed to publish listing', 'error')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-brand-navy-light rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-brand-gray/20 dark:border-brand-navy/50">
          <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
            Listing Requirements
          </h2>
          <p className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">
            Please review and accept the requirements before publishing
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                Issues to Fix
              </h3>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements List */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-green/20 dark:bg-brand-green/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-navy dark:text-brand-white">
                  Year Requirement
                </p>
                <p className="text-xs text-brand-gray dark:text-brand-white/70 mt-0.5">
                  Vehicle year must be 2010 or newer (Platform minimum)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-green/20 dark:bg-brand-green/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-navy dark:text-brand-white">
                  Clean Title Only
                </p>
                <p className="text-xs text-brand-gray dark:text-brand-white/70 mt-0.5">
                  Platform policy prohibits salvage, flood, and rebuilt titles
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-green/20 dark:bg-brand-green/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-navy dark:text-brand-white">
                  Accurate Photos and Description
                </p>
                <p className="text-xs text-brand-gray dark:text-brand-white/70 mt-0.5">
                  At least 3 photos required. All information must be accurate and truthful
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-green/20 dark:bg-brand-green/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-navy dark:text-brand-white">
                  Inspection Status
                </p>
                <p className="text-xs text-brand-gray dark:text-brand-white/70 mt-0.5">
                  Vehicle must have passed inspection to be published
                </p>
              </div>
            </div>
          </div>

          {/* Acceptance Checkbox */}
          <div className="pt-4 border-t border-brand-gray/20 dark:border-brand-navy/50">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 text-brand-blue border-brand-gray dark:border-brand-navy rounded focus:ring-brand-blue dark:focus:ring-brand-blue-light"
              />
              <span className="text-sm text-brand-navy dark:text-brand-white">
                I certify that my listing meets all requirements and contains accurate information. I understand that
                inaccurate listings may result in listing removal, account restrictions, or permanent ban.
              </span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-brand-gray/20 dark:border-brand-navy/50 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            className="px-6 py-2 bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white border border-brand-gray dark:border-brand-navy rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || accepting || validationErrors.length > 0}
            className="px-6 py-2 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Publishing...' : 'Accept & Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
