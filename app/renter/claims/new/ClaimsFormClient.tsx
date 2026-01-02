'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'

interface ClaimsFormClientProps {
  booking: any
  profileId: string
}

export default function ClaimsFormClient({ booking, profileId }: ClaimsFormClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    booking_id: booking?.id || '',
    incident_datetime: '',
    description: '',
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [policeReport, setPoliceReport] = useState<File | null>(null)
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos(files)

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handlePoliceReportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPoliceReport(file)
  }

  const uploadFile = async (file: File, path: string, bucket: string): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
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
      if (!formData.booking_id) {
        showToast('Please select a booking', 'error')
        setLoading(false)
        return
      }

      if (!formData.incident_datetime || !formData.description) {
        showToast('Please fill in all required fields', 'error')
        setLoading(false)
        return
      }

      // Verify booking belongs to user
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*, booking_insurance_elections(coverage_type)')
        .eq('id', formData.booking_id)
        .single()

      if (bookingError || !bookingData) {
        throw new Error('Booking not found')
      }

      const coverageType =
        bookingData.booking_insurance_elections?.coverage_type || 'platform_plan'

      // Get user for upload paths
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const timestamp = Date.now()

      // Upload photos
      const photoPaths: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const path = await uploadFile(
          photos[i],
          `${user.id}/claims/${timestamp}-photo-${i}.jpg`,
          'claim-photos'
        )
        photoPaths.push(path)
      }

      // Upload police report if provided
      let policeReportPath: string | null = null
      if (policeReport) {
        policeReportPath = await uploadFile(
          policeReport,
          `${user.id}/claims/${timestamp}-police-report.pdf`,
          'claim-photos'
        )
      }

      // Create claim
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          booking_id: formData.booking_id,
          renter_profile_id: profileId,
          coverage_type: coverageType,
          incident_datetime: formData.incident_datetime,
          description: formData.description,
          police_report_file_path: policeReportPath,
          status: 'submitted',
        })
        .select()
        .single()

      if (claimError) throw claimError

      // Create claim photos
      if (photoPaths.length > 0) {
        const { error: photosError } = await supabase.from('claim_photos').insert(
          photoPaths.map((path) => ({
            claim_id: claim.id,
            file_path: path,
          }))
        )

        if (photosError) throw photosError
      }

      showToast('Claim submitted successfully', 'success')
      router.push('/renter/bookings')
    } catch (error: any) {
      showToast(error.message || 'Failed to submit claim', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Booking *
        </label>
        {booking ? (
          <div className="p-4 bg-brand-gray/5 dark:bg-brand-navy/30 rounded-lg border border-brand-gray/20 dark:border-brand-navy/50">
            <p className="text-brand-navy dark:text-brand-white font-medium">
              {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
            </p>
            <p className="text-sm text-brand-gray dark:text-brand-white/70">
              Booking ID: {booking.id}
            </p>
          </div>
        ) : (
          <input
            type="text"
            name="booking_id"
            value={formData.booking_id}
            onChange={handleInputChange}
            placeholder="Enter booking ID"
            required
            className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
            disabled={loading}
          />
        )}
        <input type="hidden" name="booking_id" value={formData.booking_id} />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Incident Date & Time *
        </label>
        <input
          type="datetime-local"
          name="incident_datetime"
          value={formData.incident_datetime}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={6}
          required
          placeholder="Describe what happened in detail..."
          className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Photos
        </label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png"
          multiple
          onChange={handlePhotoChange}
          className="block w-full text-sm text-brand-gray dark:text-brand-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-blue file:text-white hover:file:bg-brand-blue-dark"
          disabled={loading}
        />
        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {photoPreviews.map((preview, index) => (
              <img
                key={index}
                src={preview}
                alt={`Preview ${index + 1}`}
                className="rounded-lg border border-brand-gray/20 max-w-full h-32 object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Police Report (Optional)
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handlePoliceReportChange}
          className="block w-full text-sm text-brand-gray dark:text-brand-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-blue file:text-white hover:file:bg-brand-blue-dark"
          disabled={loading}
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Claim'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/renter/bookings')}
          className="px-6 py-3 border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white font-semibold rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}