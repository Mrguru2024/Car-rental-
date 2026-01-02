'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'

interface VerificationApprovalClientProps {
  verifications: any[]
  verificationStates: Map<string, any>
}

export default function VerificationApprovalClient({
  verifications: initialVerifications,
  verificationStates,
}: VerificationApprovalClientProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const router = useRouter()
  const [verifications, setVerifications] = useState(initialVerifications)
  const [loading, setLoading] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleStatusChange = async (profileId: string, status: 'approved' | 'rejected') => {
    setLoading(profileId)

    try {
      const notes = adminNotes[profileId] || null

      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: status,
        })
        .eq('id', profileId)

      if (error) throw error

      // Remove from list if approved, keep if rejected (so admin can re-approve)
      if (status === 'approved') {
        setVerifications((prev) => prev.filter((v) => v.id !== profileId))
        showToast('Verification approved successfully', 'success')
      } else {
        // Update status in list
        setVerifications((prev) =>
          prev.map((v) => (v.id === profileId ? { ...v, verification_status: 'rejected' } : v))
        )
        showToast('Verification rejected', 'success')
      }

      // Refresh the page to get updated data
      router.refresh()
    } catch (error: any) {
      showToast(error.message || `Failed to ${status} verification`, 'error')
    } finally {
      setLoading(null)
    }
  }

  const getFileUrl = (filePath: string) => {
    if (!filePath) return null
    // Extract bucket and path from filePath
    // Format: "bucket-name/path/to/file.pdf"
    const parts = filePath.split('/')
    if (parts.length < 2) return null

    const bucket = parts[0]
    const path = parts.slice(1).join('/')

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  const pendingVerifications = verifications.filter((v) => v.verification_status === 'pending')
  const rejectedVerifications = verifications.filter((v) => v.verification_status === 'rejected')

  if (verifications.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-brand-navy-light rounded-xl border border-brand-gray/20 dark:border-brand-navy/50">
        <p className="text-brand-gray dark:text-brand-white/70">
          No pending verifications to review.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Pending Verifications */}
      {pendingVerifications.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Pending Approvals ({pendingVerifications.length})
          </h2>
          <div className="space-y-4">
            {pendingVerifications.map((verification) => {
              const verificationState = verificationStates.get(verification.id)
              const documents = verification.verification_documents || {}
              const isExpanded = expandedId === verification.id

              return (
                <div
                  key={verification.id}
                  className="bg-white dark:bg-brand-navy-light rounded-xl border border-brand-gray/20 dark:border-brand-navy/50 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                          {verification.full_name || 'No name provided'}
                        </h3>
                        <div className="flex gap-4 text-sm text-brand-gray dark:text-brand-white/70">
                          <span className="capitalize">{verification.role}</span>
                          <span>•</span>
                          <span>Registered: {formatDate(new Date(verification.created_at))}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-semibold rounded-full">
                        Pending
                      </span>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                          Email/User ID
                        </p>
                        <p className="text-sm text-brand-navy dark:text-brand-white">
                          {verification.user_id?.slice(0, 8)}...
                        </p>
                      </div>
                      {verification.phone && (
                        <div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                            Phone
                          </p>
                          <p className="text-sm text-brand-navy dark:text-brand-white">
                            {verification.phone}
                          </p>
                        </div>
                      )}
                      {verification.address && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                            Address
                          </p>
                          <p className="text-sm text-brand-navy dark:text-brand-white">
                            {verification.address}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Role-specific Information */}
                    {verification.role === 'renter' && (
                      <div className="mb-4 p-4 bg-brand-gray/5 dark:bg-brand-navy/30 rounded-lg">
                        <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-2">
                          Driver License Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {verification.drivers_license_number && (
                            <div>
                              <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                                License Number
                              </p>
                              <p className="text-brand-navy dark:text-brand-white">
                                {verification.drivers_license_number}
                              </p>
                            </div>
                          )}
                          {verification.drivers_license_state && (
                            <div>
                              <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                                State
                              </p>
                              <p className="text-brand-navy dark:text-brand-white">
                                {verification.drivers_license_state}
                              </p>
                            </div>
                          )}
                          {verification.drivers_license_expiration && (
                            <div>
                              <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                                Expiration
                              </p>
                              <p className="text-brand-navy dark:text-brand-white">
                                {formatDate(new Date(verification.drivers_license_expiration))}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(verification.role === 'dealer' || verification.role === 'private_host') && (
                      <div className="mb-4 p-4 bg-brand-gray/5 dark:bg-brand-navy/30 rounded-lg">
                        <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-2">
                          Business Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {verification.business_name && (
                            <div>
                              <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                                Business Name
                              </p>
                              <p className="text-brand-navy dark:text-brand-white">
                                {verification.business_name}
                              </p>
                            </div>
                          )}
                          {verification.business_license_number && (
                            <div>
                              <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                                License Number
                              </p>
                              <p className="text-brand-navy dark:text-brand-white">
                                {verification.business_license_number}
                              </p>
                            </div>
                          )}
                          {verification.business_address && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                                Business Address
                              </p>
                              <p className="text-brand-navy dark:text-brand-white">
                                {verification.business_address}
                              </p>
                            </div>
                          )}
                          {verification.tax_id && (
                            <div>
                              <p className="text-xs text-brand-gray dark:text-brand-white/50 mb-1">
                                Tax ID
                              </p>
                              <p className="text-brand-navy dark:text-brand-white">
                                {verification.tax_id}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Verification State Info */}
                    {verificationState && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-2">
                          Automated Verification Status
                        </h4>
                        <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                          Status: <span className="capitalize">{verificationState.status}</span>
                        </p>
                        {verificationState.reasons && verificationState.reasons.length > 0 && (
                          <div>
                            <p className="text-xs text-brand-gray dark:text-brand-white/70 mb-1">
                              Reasons:
                            </p>
                            <ul className="list-disc list-inside text-xs text-brand-gray dark:text-brand-white/70">
                              {verificationState.reasons.map((reason: string, idx: number) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Documents */}
                    {Object.keys(documents).length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : verification.id)}
                          className="text-sm font-medium text-brand-blue dark:text-brand-blue-light hover:underline"
                        >
                          {isExpanded ? 'Hide' : 'Show'} Documents ({Object.keys(documents).length})
                        </button>
                        {isExpanded && (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(documents).map(([key, filePath]) => {
                              const url = getFileUrl(filePath as string)
                              if (!url) return null
                              return (
                                <a
                                  key={key}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-brand-blue hover:text-brand-blue-dark underline"
                                >
                                  View {key.replace(/_/g, ' ').replace(/\b\w/g, (l) =>
                                    l.toUpperCase()
                                  )}
                                </a>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="border-t border-brand-gray/20 dark:border-brand-navy/50 pt-4 mt-4">
                      <textarea
                        placeholder="Admin notes (optional)"
                        value={adminNotes[verification.id] || ''}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({ ...prev, [verification.id]: e.target.value }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(verification.id, 'approved')}
                          disabled={loading === verification.id}
                          className="px-4 py-2 bg-brand-green hover:bg-brand-green-dark text-white font-medium rounded transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(verification.id, 'rejected')}
                          disabled={loading === verification.id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rejected Verifications */}
      {rejectedVerifications.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Previously Rejected ({rejectedVerifications.length})
          </h2>
          <div className="space-y-4">
            {rejectedVerifications.map((verification) => (
              <div
                key={verification.id}
                className="bg-white dark:bg-brand-navy-light rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                        {verification.full_name || 'No name provided'}
                      </h3>
                      <div className="flex gap-4 text-sm text-brand-gray dark:text-brand-white/70">
                        <span className="capitalize">{verification.role}</span>
                        <span>•</span>
                        <span>Rejected: {formatDate(new Date(verification.updated_at))}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs font-semibold rounded-full">
                      Rejected
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(verification.id, 'approved')}
                      disabled={loading === verification.id}
                      className="px-4 py-2 bg-brand-green hover:bg-brand-green-dark text-white font-medium rounded transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
