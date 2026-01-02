'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import Header from '@/components/Layout/Header'

export default function DealerVerificationPage() {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    business_name: '',
    business_license_number: '',
    business_address: '',
    tax_id: '',
  })
  const [documents, setDocuments] = useState({
    business_license: null as File | null,
    insurance_document: null as File | null,
    tax_document: null as File | null,
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
        router.push('/dealer')
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

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.storage
      .from('verification-docs')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabase.storage.from('verification-docs').getPublicUrl(data.path)

    return publicUrl
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

      if (documents.business_license) {
        uploads.business_license = await uploadFile(
          documents.business_license,
          `${user.id}/business-license-${timestamp}.pdf`
        )
      }
      if (documents.insurance_document) {
        uploads.insurance_document = await uploadFile(
          documents.insurance_document,
          `${user.id}/insurance-${timestamp}.pdf`
        )
      }
      if (documents.tax_document) {
        uploads.tax_document = await uploadFile(
          documents.tax_document,
          `${user.id}/tax-${timestamp}.pdf`
        )
      }

      // Update profile with verification data
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          business_name: formData.business_name,
          business_license_number: formData.business_license_number,
          business_address: formData.business_address,
          tax_id: formData.tax_id,
          verification_documents: uploads,
        })
        .eq('user_id', user.id)

      if (error) throw error

      showToast("Verification submitted successfully! We'll review your documents soon.", 'success')
      router.push('/dealer')
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
      <Header />

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
              Dealer Verification
            </h1>
            <p className="text-brand-gray dark:text-brand-white/70">
              To list vehicles on Carsera, we need to verify your business. This usually takes 1-2
              business days.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-brand-white border-b border-brand-gray/20 dark:border-brand-navy/50 pb-2">
                Business Information
              </h2>

              <div>
                <label
                  htmlFor="business_name"
                  className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
                >
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="business_name"
                  name="business_name"
                  required
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, business_name: e.target.value }))
                  }
                  placeholder="ABC Auto Sales"
                  className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>

              <div>
                <label
                  htmlFor="business_license_number"
                  className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
                >
                  Business License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="business_license_number"
                  name="business_license_number"
                  required
                  value={formData.business_license_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, business_license_number: e.target.value }))
                  }
                  placeholder="BL-123456"
                  className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>

              <div>
                <label
                  htmlFor="business_address"
                  className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
                >
                  Business Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="business_address"
                  name="business_address"
                  required
                  value={formData.business_address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, business_address: e.target.value }))
                  }
                  placeholder="123 Business St, Atlanta, GA 30301"
                  rows={3}
                  className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="tax_id"
                  className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
                >
                  Tax ID / EIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="tax_id"
                  name="tax_id"
                  required
                  value={formData.tax_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tax_id: e.target.value }))}
                  placeholder="12-3456789"
                  className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4 pt-6 border-t border-brand-gray/20 dark:border-brand-navy/50">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-brand-white border-b border-brand-gray/20 dark:border-brand-navy/50 pb-2">
                Required Documents
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
                    Business License <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-brand-gray/30 dark:border-brand-navy/50 rounded-lg hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-colors">
                    <div className="space-y-1 text-center">
                      {documentPreviews.business_license ? (
                        <div className="mt-2">
                          <p className="text-sm text-brand-green dark:text-brand-green-light font-medium">
                            ✓ Document uploaded
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFileChange('business_license', null)}
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
                              htmlFor="business_license"
                              className="relative cursor-pointer rounded-md font-medium text-brand-blue dark:text-brand-blue-light hover:text-brand-blue-dark dark:hover:text-brand-blue focus-within:outline-none"
                            >
                              <span>Upload a file</span>
                              <input
                                id="business_license"
                                name="business_license"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="sr-only"
                                onChange={(e) =>
                                  handleFileChange(
                                    'business_license',
                                    e.target.files?.[0] || null
                                  )
                                }
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/50">
                            PDF, PNG, JPG up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
                    Insurance Document <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-brand-gray/30 dark:border-brand-navy/50 rounded-lg hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-colors">
                    <div className="space-y-1 text-center">
                      {documentPreviews.insurance_document ? (
                        <div className="mt-2">
                          <p className="text-sm text-brand-green dark:text-brand-green-light font-medium">
                            ✓ Document uploaded
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFileChange('insurance_document', null)}
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
                              htmlFor="insurance_document"
                              className="relative cursor-pointer rounded-md font-medium text-brand-blue dark:text-brand-blue-light hover:text-brand-blue-dark dark:hover:text-brand-blue focus-within:outline-none"
                            >
                              <span>Upload a file</span>
                              <input
                                id="insurance_document"
                                name="insurance_document"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="sr-only"
                                onChange={(e) =>
                                  handleFileChange(
                                    'insurance_document',
                                    e.target.files?.[0] || null
                                  )
                                }
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/50">
                            PDF, PNG, JPG up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
                    Tax Document (Optional)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-brand-gray/30 dark:border-brand-navy/50 rounded-lg hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-colors">
                    <div className="space-y-1 text-center">
                      {documentPreviews.tax_document ? (
                        <div className="mt-2">
                          <p className="text-sm text-brand-green dark:text-brand-green-light font-medium">
                            ✓ Document uploaded
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFileChange('tax_document', null)}
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
                              htmlFor="tax_document"
                              className="relative cursor-pointer rounded-md font-medium text-brand-blue dark:text-brand-blue-light hover:text-brand-blue-dark dark:hover:text-brand-blue focus-within:outline-none"
                            >
                              <span>Upload a file</span>
                              <input
                                id="tax_document"
                                name="tax_document"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="sr-only"
                                onChange={(e) =>
                                  handleFileChange('tax_document', e.target.files?.[0] || null)
                                }
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-brand-gray dark:text-brand-white/50">
                            PDF, PNG, JPG up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-brand-gray/20 dark:border-brand-navy/50">
              <button
                type="submit"
                disabled={submitting || !documents.business_license || !documents.insurance_document}
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
