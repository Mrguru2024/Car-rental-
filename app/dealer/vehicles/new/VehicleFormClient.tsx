'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import AddressInput from '@/components/Address/AddressInput'
import MakeAutocomplete from '@/components/Vehicle/MakeAutocomplete'
import ModelAutocomplete from '@/components/Vehicle/ModelAutocomplete'
import { computeVehicleTier, getTierDisplayName, getTierYearRange, validateVehicleListing, PLATFORM_MIN_YEAR } from '@/lib/vehicle-tiers'

interface VehicleFormClientProps {
  readonly profileId: string
}

export default function VehicleFormClient({ profileId }: VehicleFormClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    price_per_day: 0,
    location: '',
    description: '',
    mileage_limit: null as number | null,
    status: 'active' as 'active' | 'inactive',
    title_type: 'clean' as 'clean' | 'rebuilt' | 'salvage' | 'flood' | 'other',
    inspection_status: 'pending' as 'pending' | 'passed' | 'failed',
    inspection_notes: '',
  })
  const [computedTier, setComputedTier] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [vinLookupLoading, setVinLookupLoading] = useState(false)

  // Compute tier when year changes
  useEffect(() => {
    if (formData.year >= PLATFORM_MIN_YEAR) {
      const tier = computeVehicleTier(formData.year)
      setComputedTier(tier)
    } else {
      setComputedTier('')
    }
  }, [formData.year])

  // Validate vehicle when relevant fields change
  useEffect(() => {
    if (formData.year && formData.title_type && formData.inspection_status) {
      const validation = validateVehicleListing({
        model_year: formData.year,
        title_type: formData.title_type,
        inspection_status: formData.inspection_status,
        photos_count: photoPreviews.length,
      })
      setValidationErrors(validation.errors)
    }
  }, [formData.year, formData.title_type, formData.inspection_status, photoPreviews.length])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    if (name === 'year' || name === 'price_per_day' || name === 'mileage_limit') {
      setFormData((prev) => ({ ...prev, [name]: value === '' ? null : Number(value) }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleVINLookup = async () => {
    if (!formData.vin || formData.vin.length !== 17) {
      showToast('Please enter a valid 17-character VIN', 'error')
      return
    }

    setVinLookupLoading(true)
    try {
      const response = await fetch(`/api/vehicles/vin-lookup?vin=${encodeURIComponent(formData.vin)}`)
      const contentType = response.headers.get('content-type')
      
      if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to lookup VIN')
        } else {
          throw new Error(`Failed to lookup VIN: ${response.statusText}`)
        }
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Auto-fill form fields
        setFormData((prev) => ({
          ...prev,
          make: data.data.make || prev.make,
          model: data.data.model || prev.model,
          year: data.data.year || prev.year,
        }))

        // Add Auto.dev photos to previews
        if (data.photos && data.photos.length > 0) {
          setPhotoPreviews(data.photos.slice(0, 10)) // Limit to 10 photos
          showToast(`Found vehicle data and ${data.photos.length} photos!`, 'success')
        } else {
          showToast('Vehicle data found, but no photos available', 'success')
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to lookup VIN', 'error')
    } finally {
      setVinLookupLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos((prev) => [...prev, ...files])

    // Create previews for new files only (preserve existing Auto.dev URLs)
    const newPreviews: string[] = []
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === files.length) {
          // Append new file previews to existing previews (which may include Auto.dev URLs)
          setPhotoPreviews((prev) => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.storage.from('vehicle-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabase.storage.from('vehicle-photos').getPublicUrl(data.path)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.make || !formData.model || !formData.price_per_day || !formData.location) {
        showToast('Please fill in all required fields', 'error')
        setLoading(false)
        return
      }

      // Validate year (platform minimum is 2010)
      if (formData.year < PLATFORM_MIN_YEAR) {
        showToast(`Vehicle year must be ${PLATFORM_MIN_YEAR} or newer. Platform minimum is ${PLATFORM_MIN_YEAR}.`, 'error')
        setLoading(false)
        return
      }

      if (formData.year > new Date().getFullYear() + 1) {
        showToast('Please enter a valid year', 'error')
        setLoading(false)
        return
      }

      // Validate vehicle listing
      const validation = validateVehicleListing({
        model_year: formData.year,
        title_type: formData.title_type,
        inspection_status: formData.inspection_status,
        photos_count: photoPreviews.length,
      })

      if (!validation.ok) {
        showToast(validation.errors.join('. '), 'error')
        setLoading(false)
        return
      }

      // Create vehicle (tier will be auto-computed by database trigger)
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          dealer_id: profileId,
          vin: formData.vin || null,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          price_per_day: formData.price_per_day,
          location: formData.location,
          description: formData.description || null,
          mileage_limit: formData.mileage_limit,
          status: formData.status,
          title_type: formData.title_type,
          inspection_status: formData.inspection_status,
          inspection_notes: formData.inspection_notes || null,
        })
        .select()
        .single()

      if (vehicleError) throw vehicleError

      // Handle photos: upload files and save Auto.dev URLs
      const photoUrls: string[] = []

      // Upload files from photos array
      if (photos.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const timestamp = Date.now()

        for (let i = 0; i < photos.length; i++) {
          const path = `${user.id}/vehicles/${vehicle.id}/${timestamp}-${i}.jpg`
          const url = await uploadFile(photos[i], path)
          photoUrls.push(url)
        }
      }

      // Add Auto.dev URLs from photoPreviews (URLs starting with http/https)
      const autoDevUrls = photoPreviews.filter((preview) => preview.startsWith('http'))
      photoUrls.push(...autoDevUrls)

      // Create vehicle_photos records
      if (photoUrls.length > 0) {
        const { error: photosError } = await supabase.from('vehicle_photos').insert(
          photoUrls.map((url) => ({
            vehicle_id: vehicle.id,
            file_path: url,
          }))
        )

        if (photosError) throw photosError
      }

      showToast('Vehicle added successfully!', 'success')
      router.push('/dealer/vehicles')
    } catch (error: any) {
      console.error('Error creating vehicle:', error)
      showToast(error.message || 'Failed to create vehicle', 'error')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* VIN Lookup Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-3">
          Quick Fill with VIN (Optional)
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => setFormData((prev) => ({ ...prev, vin: e.target.value.toUpperCase() }))}
              placeholder="Enter 17-character VIN (e.g., WP0AF2A99KS165242)"
              maxLength={17}
              className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white uppercase"
            />
          </div>
          <button
            type="button"
            onClick={handleVINLookup}
            disabled={vinLookupLoading || !formData.vin || formData.vin.length !== 17}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {vinLookupLoading ? 'Looking up...' : 'Lookup VIN'}
          </button>
        </div>
        <p className="text-xs text-brand-gray dark:text-brand-white/70 mt-2">
          Automatically fill vehicle details and fetch photos from Auto.dev
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">Validation Errors</h3>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Year <span className="text-red-500">*</span>
            {computedTier && (
              <span className="ml-2 text-xs font-normal text-brand-gray dark:text-brand-white/70">
                (Tier: {computedTier.toUpperCase()} - {getTierDisplayName(computedTier as any)})
              </span>
            )}
          </label>
          <input
            id="year"
            type="number"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            min={PLATFORM_MIN_YEAR}
            max={new Date().getFullYear() + 1}
            required
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white ${
              formData.year < PLATFORM_MIN_YEAR
                ? 'border-red-500 dark:border-red-500'
                : 'border-brand-gray dark:border-brand-navy'
            }`}
            placeholder={`${PLATFORM_MIN_YEAR} or newer`}
          />
          {formData.year < PLATFORM_MIN_YEAR && (
            <p className="text-xs text-red-500 mt-1">
              Minimum year is {PLATFORM_MIN_YEAR} (Platform requirement)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="make" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Make <span className="text-red-500">*</span>
          </label>
          <MakeAutocomplete
            id="make"
            name="make"
            value={formData.make}
            onChange={(value) => setFormData((prev) => ({ ...prev, make: value }))}
            required
            className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
            placeholder="e.g., Toyota"
          />
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Model <span className="text-red-500">*</span>
          </label>
          <ModelAutocomplete
            id="model"
            name="model"
            value={formData.model}
            onChange={(value) => setFormData((prev) => ({ ...prev, model: value }))}
            make={formData.make}
            year={formData.year}
            required
            className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="mileage_limit" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Mileage Limit (miles/day, optional)
          </label>
          <input
            id="mileage_limit"
            type="number"
            name="mileage_limit"
            value={formData.mileage_limit || ''}
            onChange={handleInputChange}
            min="0"
            className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
            placeholder="Leave empty for unlimited"
          />
        </div>

        <div>
          <label htmlFor="title_type" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Title Type <span className="text-red-500">*</span>
          </label>
          <select
            id="title_type"
            name="title_type"
            value={formData.title_type}
            onChange={handleInputChange}
            required
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white ${
              ['salvage', 'flood', 'rebuilt'].includes(formData.title_type)
                ? 'border-red-500 dark:border-red-500'
                : 'border-brand-gray dark:border-brand-navy'
            }`}
          >
            <option value="clean">Clean</option>
            <option value="other">Other</option>
            <option value="rebuilt" disabled>Rebuilt (Not Allowed)</option>
            <option value="salvage" disabled>Salvage (Not Allowed)</option>
            <option value="flood" disabled>Flood (Not Allowed)</option>
          </select>
          {['salvage', 'flood', 'rebuilt'].includes(formData.title_type) && (
            <p className="text-xs text-red-500 mt-1">
              Platform policy prohibits salvage, flood, and rebuilt titles.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="inspection_status" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Inspection Status <span className="text-red-500">*</span>
          </label>
          <select
            id="inspection_status"
            name="inspection_status"
            value={formData.inspection_status}
            onChange={handleInputChange}
            required
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white ${
              formData.inspection_status === 'failed'
                ? 'border-red-500 dark:border-red-500'
                : 'border-brand-gray dark:border-brand-navy'
            }`}
          >
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
          {formData.inspection_status === 'failed' && (
            <p className="text-xs text-red-500 mt-1">
              Vehicles with failed inspection cannot be published.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Inspection Notes */}
      {formData.inspection_status !== 'pending' && (
        <div>
          <label htmlFor="inspection_notes" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Inspection Notes (optional)
          </label>
          <textarea
            id="inspection_notes"
            name="inspection_notes"
            value={formData.inspection_notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
            placeholder="Add notes about the inspection..."
          />
        </div>
      )}

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          placeholder="Describe the vehicle's features, condition, etc."
        />
      </div>

      <div>
        <label htmlFor="photos" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Photos (optional, up to 10)
        </label>
        <input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
        />
        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {photoPreviews.map((preview, idx) => (
              <div key={idx} className="relative">
                <img
                  src={preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-brand-gray dark:border-brand-navy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Vehicle'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white border border-brand-gray dark:border-brand-navy rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
