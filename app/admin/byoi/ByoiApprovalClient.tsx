'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import { formatDate } from '@/lib/utils/format'

interface ByoiApprovalClientProps {
  byoiDocs: any[]
}

export default function ByoiApprovalClient({ byoiDocs: initialByoiDocs }: ByoiApprovalClientProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [byoiDocs, setByoiDocs] = useState(initialByoiDocs)
  const [loading, setLoading] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  const handleStatusChange = async (docId: string, status: 'approved' | 'rejected') => {
    setLoading(docId)

    try {
      const notes = adminNotes[docId] || null

      const { error } = await supabase
        .from('byoi_documents')
        .update({
          status,
          admin_notes: notes,
        })
        .eq('id', docId)

      if (error) throw error

      // Remove from list if approved, update if rejected
      setByoiDocs((prev) => prev.filter((doc) => doc.id !== docId))
      showToast(`Document ${status === 'approved' ? 'approved' : 'rejected'} successfully`, 'success')
    } catch (error: any) {
      showToast(error.message || `Failed to ${status} document`, 'error')
    } finally {
      setLoading(null)
    }
  }

  const getFileUrl = (filePath: string) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from('byoi-docs').getPublicUrl(filePath)
    return publicUrl
  }

  const pendingDocs = byoiDocs.filter((doc) => doc.status === 'pending')
  const rejectedDocs = byoiDocs.filter((doc) => doc.status === 'rejected')

  if (byoiDocs.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-brand-navy-light rounded-xl border border-brand-gray/20 dark:border-brand-navy/50">
        <p className="text-brand-gray dark:text-brand-white/70">No pending BYOI documents to review.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Pending Documents */}
      {pendingDocs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Pending Approval ({pendingDocs.length})
          </h2>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl border border-brand-gray/20 dark:border-brand-navy/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-gray/5 dark:bg-brand-navy/30 border-b border-brand-gray/20 dark:border-brand-navy/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Renter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Policyholder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Expiration Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
                  {pendingDocs.map((doc) => {
                    const renter = doc.profiles
                    return (
                      <tr key={doc.id} className="hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-brand-navy dark:text-brand-white">
                            {renter?.full_name || 'N/A'}
                          </div>
                          <div className="text-xs text-brand-gray dark:text-brand-white/70">
                            {renter?.user_id?.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-navy dark:text-brand-white">
                          {doc.policyholder_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-navy dark:text-brand-white">
                          {formatDate(new Date(doc.effective_date))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-navy dark:text-brand-white">
                          {formatDate(new Date(doc.expiration_date))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={getFileUrl(doc.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-blue hover:text-brand-blue-dark text-sm font-medium"
                          >
                            View Document
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <textarea
                              placeholder="Admin notes (optional)"
                              value={adminNotes[doc.id] || ''}
                              onChange={(e) =>
                                setAdminNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                              }
                              rows={2}
                              className="w-full px-3 py-2 text-xs border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStatusChange(doc.id, 'approved')}
                                disabled={loading === doc.id}
                                className="px-3 py-1 text-xs bg-brand-green hover:bg-brand-green-dark text-white font-medium rounded transition-colors disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleStatusChange(doc.id, 'rejected')}
                                disabled={loading === doc.id}
                                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rejected Documents */}
      {rejectedDocs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
            Previously Rejected ({rejectedDocs.length})
          </h2>
          <div className="bg-white dark:bg-brand-navy-light rounded-xl border border-brand-gray/20 dark:border-brand-navy/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-gray/5 dark:bg-brand-navy/30 border-b border-brand-gray/20 dark:border-brand-navy/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Renter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Policyholder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Admin Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
                  {rejectedDocs.map((doc) => {
                    const renter = doc.profiles
                    return (
                      <tr key={doc.id} className="hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-brand-navy dark:text-brand-white">
                            {renter?.full_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-navy dark:text-brand-white">
                          {doc.policyholder_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={getFileUrl(doc.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-blue hover:text-brand-blue-dark text-sm font-medium"
                          >
                            View Document
                          </a>
                        </td>
                        <td className="px-6 py-4 text-sm text-brand-navy dark:text-brand-white">
                          {doc.admin_notes || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleStatusChange(doc.id, 'approved')}
                            disabled={loading === doc.id}
                            className="px-3 py-1 text-xs bg-brand-green hover:bg-brand-green-dark text-white font-medium rounded transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}