'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'

interface LiabilityAcceptanceClientProps {
  booking: any
  profile: any
  existingAcceptance: any
}

const ACCEPTANCE_TEXT = `I understand that by declining the platform Protection Plan, I am relying on my own insurance policy. I accept full financial responsibility for any damages, losses, or claims not covered by my insurer, including vehicle damage, third-party liability, and administrative costs.`

export default function LiabilityAcceptanceClient({
  booking,
  profile,
  existingAcceptance,
}: LiabilityAcceptanceClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(!!existingAcceptance)
  const [accepted, setAccepted] = useState(false)
  const [typedName, setTypedName] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || existingAcceptance) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setHasScrolled(true)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [existingAcceptance])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!accepted) {
      showToast('Please check the acceptance checkbox', 'error')
      return
    }

    if (!typedName.trim()) {
      showToast('Please type your full name', 'error')
      return
    }

    if (typedName.trim().toLowerCase() !== profile.full_name?.toLowerCase().trim()) {
      showToast('The name must match your profile name', 'error')
      return
    }

    setLoading(true)

    try {
      // Get IP and user agent (client-side only)
      const ipAddress = null // Cannot get IP reliably on client
      const userAgent = navigator.userAgent

      const { error } = await supabase.from('liability_acceptances').insert({
        booking_id: booking.id,
        user_id: profile.id,
        acceptance_text_version: 'v1',
        acceptance_text: ACCEPTANCE_TEXT,
        typed_full_name: typedName.trim(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      if (error) throw error

      showToast('Liability acceptance recorded', 'success')
      router.push(`/checkout/${booking.id}/review`)
    } catch (error: any) {
      showToast(error.message || 'Failed to record acceptance', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (existingAcceptance) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            Liability acceptance already recorded.
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Accepted on: {new Date(existingAcceptance.accepted_at).toLocaleString()}
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => router.push(`/checkout/${booking.id}/review`)}
            className="px-6 py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-lg transition-colors"
          >
            Continue to Review
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scrollable Acceptance Text */}
      <div className="border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg">
        <div className="p-4 border-b border-brand-gray/20 dark:border-brand-navy/50 bg-brand-gray/5 dark:bg-brand-navy/30">
          <h2 className="font-semibold text-brand-navy dark:text-brand-white">
            Liability Acceptance Terms
          </h2>
          <p className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">
            Please read the full text below
          </p>
        </div>
        <div
          ref={scrollContainerRef}
          className="p-6 max-h-64 overflow-y-auto bg-white dark:bg-brand-navy-light"
        >
          <p className="text-brand-navy dark:text-brand-white leading-relaxed whitespace-pre-line">
            {ACCEPTANCE_TEXT}
          </p>
        </div>
        {!hasScrolled && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-brand-gray/20 dark:border-brand-navy/50">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              Please scroll to the bottom to continue
            </p>
          </div>
        )}
      </div>

      {/* Acceptance Checkbox */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="accept"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          disabled={!hasScrolled || loading}
          className="mt-1 w-5 h-5 text-brand-blue border-brand-gray/20 rounded focus:ring-brand-blue disabled:opacity-50"
        />
        <label
          htmlFor="accept"
          className={`text-sm ${hasScrolled ? 'text-brand-navy dark:text-brand-white' : 'text-brand-gray dark:text-brand-white/50'}`}
        >
          I have read and understand the liability acceptance terms above
        </label>
      </div>

      {/* Typed Name */}
      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Type your full name to confirm acceptance: <span className="font-semibold">{profile.full_name}</span>
        </label>
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={profile.full_name || 'Your full name'}
          disabled={!accepted || loading}
          className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white disabled:opacity-50"
          required
        />
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={!hasScrolled || !accepted || !typedName.trim() || loading}
          className="px-6 py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Accept and Continue'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/checkout/${booking.id}/byoi`)}
          className="px-6 py-3 border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white font-semibold rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50 transition-colors"
        >
          Back
        </button>
      </div>
    </form>
  )
}