'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'

interface ByoiUploadClientProps {
  booking: any
  profileId: string
  existingByoi: any
  existingElection: any
}

export default function ByoiUploadClient({
  booking,
  profileId,
  existingByoi,
  existingElection,
}: ByoiUploadClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    policyholder_name: existingByoi?.policyholder_name || '',
    policy_number: existingByoi?.policy_number || '',
    insurer_name: existingByoi?.insurer_name || '',
    coverage_notes: existingByoi?.coverage_notes || '',
    effective_date: existingByoi?.effective_date || '',
    expiration_date: existingByoi?.expiration_date || '',
  })

  const byoiDoc = existingElection?.byoi_documents || existingByoi
  const isApproved = byoiDoc?.status === 'approved'
  const isPending = byoiDoc?.status === 'pending'
  const isRejected = byoiDoc?.status === 'rejected'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.storage.from('byoi-docs').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) throw error

    return data.path
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!file && !byoiDoc) {
        showToast('Please upload an insurance document', 'error')
        setLoading(false)
        return
      }

      if (!formData.policyholder_name || !formData.effective_date || !formData.expiration_date) {
        showToast('Please fill in all required fields', 'error')
        setLoading(false)
        return
      }

      let filePath = byoiDoc?.file_path

      // Upload new file if provided
      if (file) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const timestamp = Date.now()
        filePath = await uploadFile(file, `${user.id}/byoi-${timestamp}.pdf`)
      }

      if (!filePath) {
        throw new Error('File path is required')
      }

      // Create or update BYOI document
      let byoiDocId = byoiDoc?.id

      if (byoiDocId) {
        const { error } = await supabase
          .from('byoi_documents')
          .update({
            file_path: filePath,
            policyholder_name: formData.policyholder_name,
            policy_number: formData.policy_number || null,
            insurer_name: formData.insurer_name || null,
            coverage_notes: formData.coverage_notes || null,
            effective_date: formData.effective_date,
            expiration_date: formData.expiration_date,
            status: 'pending',
          })
          .eq('id', byoiDocId)

        if (error) throw error
      } else {
        const { data: newDoc, error } = await supabase
          .from('byoi_documents')
          .insert({
            renter_profile_id: profileId,
            file_path: filePath,
            policyholder_name: formData.policyholder_name,
            policy_number: formData.policy_number || null,
            insurer_name: formData.insurer_name || null,
            coverage_notes: formData.coverage_notes || null,
            effective_date: formData.effective_date,
            expiration_date: formData.expiration_date,
            status: 'pending',
          })
          .select()
          .single()

        if (error) throw error
        byoiDocId = newDoc.id
      }

      // Create or update election
      const electionData = {
        booking_id: booking.id,
        coverage_type: 'byoi' as const,
        byoi_document_id: byoiDocId,
        plan_fee_cents: 0,
        deductible_cents: 0,
        coverage_snapshot_json: {},
      }

      if (existingElection) {
        const { error } = await supabase
          .from('booking_insurance_elections')
          .update(electionData)
          .eq('id', existingElection.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('booking_insurance_elections').insert(electionData)
        if (error) throw error
      }

      // Update booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          coverage_type: 'byoi',
          plan_fee_cents: 0,
        })
        .eq('id', booking.id)

      if (bookingError) throw bookingError

      showToast('Insurance document submitted for approval', 'success')
      router.refresh()
    } catch (error: any) {
      showToast(error.message || 'Failed to submit insurance document', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (isApproved) {
      // Check if liability acceptance is needed
      router.push(`/checkout/${booking.id}/liability`)
    } else {
      router.push(`/checkout/${booking.id}/review`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isPending && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            Your insurance must be approved before you can checkout.
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            Status: Pending approval
          </p>
        </div>
      )}

      {isRejected && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">
            Your insurance document was rejected.
          </p>
          {byoiDoc?.admin_notes && (
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{byoiDoc.admin_notes}</p>
          )}
        </div>
      )}

      {isApproved && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            Your insurance document has been approved!
          </p>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Insurance Declaration Page *
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="block w-full text-sm text-brand-gray dark:text-brand-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-blue file:text-white hover:file:bg-brand-blue-dark"
            disabled={loading}
          />
          {filePreview && (
            <div className="mt-4">
              <img src={filePreview} alt="Preview" className="max-w-xs rounded-lg border border-brand-gray/20" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Policyholder Name *
          </label>
          <input
            type="text"
            name="policyholder_name"
            value={formData.policyholder_name}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
              Policy Number
            </label>
            <input
              type="text"
              name="policy_number"
              value={formData.policy_number}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
              Insurer Name
            </label>
            <input
              type="text"
              name="insurer_name"
              value={formData.insurer_name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
              Effective Date *
            </label>
            <input
              type="date"
              name="effective_date"
              value={formData.effective_date}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
              Expiration Date *
            </label>
            <input
              type="date"
              name="expiration_date"
              value={formData.expiration_date}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Coverage Notes
          </label>
          <textarea
            name="coverage_notes"
            value={formData.coverage_notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
            disabled={loading}
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || isApproved}
            className="px-6 py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : isApproved ? 'Already Approved' : 'Submit for Approval'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/checkout/${booking.id}/coverage`)}
            className="px-6 py-3 border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white font-semibold rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50 transition-colors"
          >
            Back
          </button>
        </div>
      </form>

      {/* Continue Button (if approved) */}
      {isApproved && (
        <div className="flex justify-end pt-4 border-t border-brand-gray/20 dark:border-brand-navy/50">
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-lg transition-colors"
          >
            Continue to Liability Acceptance
          </button>
        </div>
      )}
    </div>
  )
}