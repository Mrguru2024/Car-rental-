'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'

interface DocumentAuditClientProps {
  flaggedAudits: any[]
  pendingAudits: any[]
  currentAuditorId: string | null
}

export default function DocumentAuditClient({
  flaggedAudits: initialFlaggedAudits,
  pendingAudits: initialPendingAudits,
  currentAuditorId,
}: DocumentAuditClientProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const router = useRouter()
  const [audits, setAudits] = useState(initialFlaggedAudits)
  const [pendingAudits, setPendingAudits] = useState(initialPendingAudits)
  const [loading, setLoading] = useState<string | null>(null)
  const [auditorNotes, setAuditorNotes] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleAuditorDecision = async (
    auditId: string,
    decision: 'approved' | 'rejected',
    profileId: string
  ) => {
    if (!currentAuditorId) {
      showToast('Auditor ID not found', 'error')
      return
    }

    setLoading(auditId)

    try {
      const notes = auditorNotes[auditId] || null

      // Update audit record with Prime Admin decision
      const { error: auditError } = await supabase
        .from('document_verification_audits')
        .update({
          auditor_id: currentAuditorId,
          auditor_decision: decision,
          auditor_notes: notes,
          auditor_decision_at: new Date().toISOString(),
          verification_status: decision === 'approved' ? 'verified' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId)

      if (auditError) throw auditError

      // If approved, we can optionally update the profile verification status
      // For now, we'll leave profile verification_status as-is since regular admins handle that
      // The audit is a separate layer

      showToast(`Document ${decision === 'approved' ? 'approved' : 'rejected'} successfully`, 'success')

      // Remove from pending list
      setPendingAudits((prev) => prev.filter((a) => a.id !== auditId))
      setAudits((prev) => prev.map((a) => (a.id === auditId ? { ...a, auditor_decision: decision } : a)))

      // Refresh the page to get updated data
      router.refresh()
    } catch (error: any) {
      showToast(error.message || `Failed to ${decision} document`, 'error')
    } finally {
      setLoading(null)
    }
  }

  const getFileUrl = (filePath: string) => {
    if (!filePath) return null
    const parts = filePath.split('/')
    if (parts.length < 2) return null

    const bucket = parts[0]
    const path = parts.slice(1).join('/')

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  const getFlagTypeColor = (type: string) => {
    switch (type) {
      case 'invalid':
        return 'text-red-600 dark:text-red-400'
      case 'inconsistency':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'suspicious':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (pendingAudits.length === 0 && audits.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-brand-navy-light rounded-xl border border-brand-gray/20 dark:border-brand-navy/50">
        <p className="text-brand-gray dark:text-brand-white/70">
          No flagged documents requiring review.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Pending Review (Not yet reviewed by Prime Admin) */}
      {pendingAudits.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Pending Prime Admin Review ({pendingAudits.length})
          </h2>
          <div className="space-y-4">
            {pendingAudits.map((audit) => {
              const profile = audit.profiles
              const flags = audit.flags || []
              const botResult = audit.bot_check_result || {}
              const documents = profile?.verification_documents || {}
              const documentPath = documents[audit.document_type]
              const isExpanded = expandedId === audit.id

              // Count flags by severity
              const highSeverityCount = flags.filter((f: any) => f.severity === 'high').length
              const mediumSeverityCount = flags.filter((f: any) => f.severity === 'medium').length
              const lowSeverityCount = flags.filter((f: any) => f.severity === 'low').length

              return (
                <div
                  key={audit.id}
                  className="bg-white dark:bg-brand-navy-light rounded-xl border-2 border-yellow-200 dark:border-yellow-800/50 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                          {profile?.full_name || 'Unknown User'} - {audit.document_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </h3>
                        <div className="flex gap-4 text-sm text-brand-gray dark:text-brand-white/70">
                          <span className="capitalize">{profile?.role}</span>
                          <span>•</span>
                          <span>Flagged: {formatDate(new Date(audit.created_at))}</span>
                          <span>•</span>
                          <span>{flags.length} flag{flags.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {highSeverityCount > 0 && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs font-semibold rounded-full">
                            {highSeverityCount} High
                          </span>
                        )}
                        {mediumSeverityCount > 0 && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-semibold rounded-full">
                            {mediumSeverityCount} Medium
                          </span>
                        )}
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-semibold rounded-full">
                          Needs Review
                        </span>
                      </div>
                    </div>

                    {/* Bot Check Summary */}
                    {botResult.summary && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-2">
                          Automated Bot Check Summary
                        </h4>
                        <p className="text-sm text-brand-gray dark:text-brand-white/70">
                          {botResult.summary}
                        </p>
                      </div>
                    )}

                    {/* Flags */}
                    {flags.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-2">
                          Flagged Issues ({flags.length})
                        </h4>
                        <div className="space-y-2">
                          {flags.map((flag: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 dark:bg-brand-navy/30 rounded-lg border border-gray-200 dark:border-brand-navy/50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded ${getSeverityColor(
                                        flag.severity
                                      )}`}
                                    >
                                      {flag.severity.toUpperCase()}
                                    </span>
                                    <span
                                      className={`text-xs font-medium capitalize ${getFlagTypeColor(
                                        flag.type
                                      )}`}
                                    >
                                      {flag.type}
                                    </span>
                                    {flag.field && (
                                      <span className="text-xs text-brand-gray dark:text-brand-white/50">
                                        Field: {flag.field}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-brand-navy dark:text-brand-white">
                                    {flag.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Document Preview */}
                    {documentPath && (
                      <div className="mb-4">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : audit.id)}
                          className="text-sm font-medium text-brand-blue dark:text-brand-blue-light hover:underline"
                        >
                          {isExpanded ? 'Hide' : 'Show'} Document
                        </button>
                        {isExpanded && (
                          <div className="mt-2">
                            <a
                              href={getFileUrl(documentPath) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand-blue hover:text-brand-blue-dark underline"
                            >
                              View {audit.document_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Document
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* User Profile Info */}
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-brand-navy/30 rounded-lg">
                      <h4 className="text-sm font-semibold text-brand-navy dark:text-brand-white mb-2">
                        User Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {profile?.full_name && (
                          <div>
                            <span className="text-brand-gray dark:text-brand-white/50">Name: </span>
                            <span className="text-brand-navy dark:text-brand-white">
                              {profile.full_name}
                            </span>
                          </div>
                        )}
                        {profile?.role && (
                          <div>
                            <span className="text-brand-gray dark:text-brand-white/50">Role: </span>
                            <span className="text-brand-navy dark:text-brand-white capitalize">
                              {profile.role}
                            </span>
                          </div>
                        )}
                        {profile?.drivers_license_number && (
                          <div>
                            <span className="text-brand-gray dark:text-brand-white/50">
                              License #:{' '}
                            </span>
                            <span className="text-brand-navy dark:text-brand-white">
                              {profile.drivers_license_number}
                            </span>
                          </div>
                        )}
                        {profile?.business_name && (
                          <div>
                            <span className="text-brand-gray dark:text-brand-white/50">
                              Business:{' '}
                            </span>
                            <span className="text-brand-navy dark:text-brand-white">
                              {profile.business_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Prime Admin Actions */}
                    <div className="border-t border-brand-gray/20 dark:border-brand-navy/50 pt-4 mt-4">
                      <textarea
                        placeholder="Prime Admin notes (required for rejections)"
                        value={auditorNotes[audit.id] || ''}
                        onChange={(e) =>
                          setAuditorNotes((prev) => ({ ...prev, [audit.id]: e.target.value }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAuditorDecision(audit.id, 'approved', profile.id)}
                          disabled={loading === audit.id}
                          className="px-4 py-2 bg-brand-green hover:bg-brand-green-dark text-white font-medium rounded transition-colors disabled:opacity-50"
                        >
                          Approve Document
                        </button>
                        <button
                          onClick={() => handleAuditorDecision(audit.id, 'rejected', profile.id)}
                          disabled={loading === audit.id || !auditorNotes[audit.id]}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                        >
                          Reject Document
                        </button>
                      </div>
                      {!auditorNotes[audit.id] && (
                        <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-2">
                          Notes are required before rejecting
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Previously Reviewed */}
      {audits.filter((a) => a.auditor_decision).length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Previously Reviewed ({audits.filter((a) => a.auditor_decision).length})
          </h2>
          <div className="space-y-4">
            {audits
              .filter((a) => a.auditor_decision)
              .map((audit) => {
                const profile = audit.profiles
                return (
                  <div
                    key={audit.id}
                    className={`bg-white dark:bg-brand-navy-light rounded-xl border overflow-hidden ${
                      audit.auditor_decision === 'approved'
                        ? 'border-brand-green/50 dark:border-brand-green/30'
                        : 'border-red-200 dark:border-red-800/50'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                            {profile?.full_name || 'Unknown'} - {audit.document_type}
                          </h3>
                          <p className="text-sm text-brand-gray dark:text-brand-white/70">
                            {audit.auditor_decision === 'approved' ? 'Approved' : 'Rejected'} by Prime
                            Admin on {formatDate(new Date(audit.auditor_decision_at || audit.updated_at))}
                          </p>
                          {audit.auditor_notes && (
                            <p className="text-sm text-brand-gray dark:text-brand-white/70 mt-2">
                              Notes: {audit.auditor_notes}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            audit.auditor_decision === 'approved'
                              ? 'bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          }`}
                        >
                          {audit.auditor_decision?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
