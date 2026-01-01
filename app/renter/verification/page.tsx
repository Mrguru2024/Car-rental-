'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import Header from '@/components/Layout/Header'

export default function RenterVerificationPage() {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    drivers_license_number: '',
    drivers_license_state: '',
    drivers_license_expiration: '',
  })
  const [documents, setDocuments] = useState({
    drivers_license_front: null as File | null,
    drivers_license_back: null as File | null,
    selfie: null as File | null,
  })
  const [documentPreviews, setDocumentPreviews] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      if (profileData.verification_status === 'approved') {
        router.push('/renter')
      }
    }
    setLoading(false)
  }

  const handleFileChange = (field: string, file: File | null) => {
    setDocuments((prev) => ({ ...prev, [field]: file }))
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setDocumentPreviews((prev) => ({
          ...prev,
          [field]: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    } else {
      setDocumentPreviews((prev) => {
        const newPreviews = { ...prev }
        delete newPreviews[field]
        return newPreviews
      })
    }
  }

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage.from('verification-docs').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from('verification-docs').getPublicUrl(data.path)

      return publicUrl
    } catch (error: any) {
      console.error('Upload error:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload documents
      const timestamp = Date.now()
      const uploads: Record<string, string | null> = {}

      if (documents.drivers_license_front) {
        uploads.drivers_license_front = await uploadFile(
          documents.drivers_license_front,
          `${user.id}/license-front-${timestamp}.jpg`
        )
      }
      if (documents.drivers_license_back) {
        uploads.drivers_license_back = await uploadFile(
          documents.drivers_license_back,
          `${user.id}/license-back-${timestamp}.jpg`
        )
      }
      if (documents.selfie) {
        uploads.selfie = await uploadFile(
          documents.selfie,
          `${user.id}/selfie-${timestamp}.jpg`
        )
      }

      // Update profile with verification data
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          drivers_license_number: formData.drivers_license_number,
          drivers_license_state: formData.drivers_license_state,
          drivers_license_expiration: formData.drivers_license_expiration,
          verification_documents: uploads,
        })
        .eq('user_id', user.id)

      if (error) throw error

      showToast('Verification submitted successfully', 'success')
      router.push('/renter')
    } catch (error: any) {
      showToast(error.message || 'Failed to submit verification', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-white dark:bg-brand-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue dark:border-brand-blue-light mx-auto mb-4"></div>
          <p className="text-brand-navy dark:text-brand-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={null} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-green dark:bg-brand-green border-2 border-brand-green dark:border-brand-green text-white">
              ✓
            </div>
            <div className="h-1 w-24 bg-brand-green dark:bg-brand-green"></div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-blue dark:bg-brand-blue-light border-2 border-brand-blue dark:border-brand-blue-light text-white">
              2
            </div>
          </div>
          <div className="flex justify-center space-x-24">
            <span className="text-sm font-medium text-brand-gray dark:text-brand-white/70">
              Profile Created
            </span>
            <span className="text-sm font-medium text-brand-blue dark:text-brand-blue-light">
              Verification
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-lg dark:shadow-brand-navy/30 p-8 border border-brand-white dark:border-brand-navy/50">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
              Renter Verification
            </h1>
            <p className="text-brand-gray dark:text-brand-white/70">
              Complete your verification to start booking vehicles. This usually takes 1-2 business
              days.
            </p>
          </div>

        {profile?.verification_status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Your verification is pending review. We'll notify you once it's approved.
            </p>
          </div>
        )}

          <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="license_number" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
              Driver's License Number *
            </label>
            <input
              id="license_number"
              type="text"
              value={formData.drivers_license_number}
              onChange={(e) =>
                setFormData({ ...formData, drivers_license_number: e.target.value })
              }
              required
              className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
            />
          </div>

          <div>
            <label htmlFor="license_state" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
              Driver's License State *
            </label>
            <input
              id="license_state"
              type="text"
              value={formData.drivers_license_state}
              onChange={(e) =>
                setFormData({ ...formData, drivers_license_state: e.target.value })
              }
              required
              placeholder="GA"
              maxLength={2}
              className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
            />
          </div>

          <div>
            <label htmlFor="license_expiration" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
              License Expiration Date *
            </label>
            <input
              id="license_expiration"
              type="date"
              value={formData.drivers_license_expiration}
              onChange={(e) =>
                setFormData({ ...formData, drivers_license_expiration: e.target.value })
              }
              required
              className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
            />
          </div>

          {/* Documents Section */}
          <div className="space-y-4 pt-6 border-t border-brand-gray/20 dark:border-brand-navy/50">
            <h2 className="text-xl font-semibold text-brand-navy dark:text-brand-white border-b border-brand-gray/20 dark:border-brand-navy/50 pb-2">
              Required Documents
            </h2>

            <div>
              <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
                Driver's License (Front) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-brand-gray/30 dark:border-brand-navy/50 rounded-lg hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-colors">
                <div className="space-y-1 text-center">
                  {documentPreviews.drivers_license_front ? (
                    <div className="mt-2">
                      <img
                        src={documentPreviews.drivers_license_front}
                        alt="License front preview"
                        className="max-h-32 mx-auto rounded-lg mb-2"
                      />
                      <p className="text-sm text-brand-green dark:text-brand-green-light font-medium">
                        ✓ Document uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => handleFileChange('drivers_license_front', null)}
                        className="mt-2 text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-brand-gray dark:text-brand-white/30"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-brand-gray dark:text-brand-white/70">
                        <label
                          htmlFor="license_front"
                          className="relative cursor-pointer rounded-md font-medium text-brand-blue dark:text-brand-blue-light hover:text-brand-blue-dark dark:hover:text-brand-blue focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            id="license_front"
                            name="license_front"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) =>
                              handleFileChange('drivers_license_front', e.target.files?.[0] || null)
                            }
                            required
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-brand-gray dark:text-brand-white/50">
                        PNG, JPG up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
                Driver's License (Back) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-brand-gray/30 dark:border-brand-navy/50 rounded-lg hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-colors">
                <div className="space-y-1 text-center">
                  {documentPreviews.drivers_license_back ? (
                    <div className="mt-2">
                      <img
                        src={documentPreviews.drivers_license_back}
                        alt="License back preview"
                        className="max-h-32 mx-auto rounded-lg mb-2"
                      />
                      <p className="text-sm text-brand-green dark:text-brand-green-light font-medium">
                        ✓ Document uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => handleFileChange('drivers_license_back', null)}
                        className="mt-2 text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-brand-gray dark:text-brand-white/30"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-brand-gray dark:text-brand-white/70">
                        <label
                          htmlFor="license_back"
                          className="relative cursor-pointer rounded-md font-medium text-brand-blue dark:text-brand-blue-light hover:text-brand-blue-dark dark:hover:text-brand-blue focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            id="license_back"
                            name="license_back"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) =>
                              handleFileChange('drivers_license_back', e.target.files?.[0] || null)
                            }
                            required
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-brand-gray dark:text-brand-white/50">
                        PNG, JPG up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
                Selfie with License <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-brand-gray/30 dark:border-brand-navy/50 rounded-lg hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-colors">
                <div className="space-y-1 text-center">
                  {documentPreviews.selfie ? (
                    <div className="mt-2">
                      <img
                        src={documentPreviews.selfie}
                        alt="Selfie preview"
                        className="max-h-32 mx-auto rounded-lg mb-2"
                      />
                      <p className="text-sm text-brand-green dark:text-brand-green-light font-medium">
                        ✓ Document uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => handleFileChange('selfie', null)}
                        className="mt-2 text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-brand-gray dark:text-brand-white/30"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-brand-gray dark:text-brand-white/70">
                        <label
                          htmlFor="selfie"
                          className="relative cursor-pointer rounded-md font-medium text-brand-blue dark:text-brand-blue-light hover:text-brand-blue-dark dark:hover:text-brand-blue focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            id="selfie"
                            name="selfie"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) =>
                              handleFileChange('selfie', e.target.files?.[0] || null)
                            }
                            required
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-brand-gray dark:text-brand-white/50">
                        PNG, JPG up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-brand-gray/20 dark:border-brand-navy/50">
            <button
              type="submit"
              disabled={submitting || !documents.drivers_license_front || !documents.drivers_license_back || !documents.selfie}
              className="w-full px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                'Submit for Verification'
              )}
            </button>
            <p className="mt-3 text-xs text-center text-brand-gray dark:text-brand-white/70">
              By submitting, you agree that all information provided is accurate and up-to-date.
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}