'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import AddressInput from '@/components/Address/AddressInput'
import MakeAutocomplete from '@/components/Vehicle/MakeAutocomplete'
import ModelAutocomplete from '@/components/Vehicle/ModelAutocomplete'

interface VehicleEditClientProps {
  readonly vehicleId: string
  readonly initialData: any
}

export default function VehicleEditClient({ vehicleId, initialData }: VehicleEditClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    vin: initialData.vin || '',
    make: initialData.make || '',
    model: initialData.model || '',
    year: initialData.year || new Date().getFullYear(),
    price_per_day: initialData.price_per_day || 0,
    location: initialData.location || '',
    description: initialData.description || '',
    mileage_limit: initialData.mileage_limit || null,
    status: initialData.status || 'active',
  })
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    initialData.vehicle_photos?.map((p: any) => p.file_path) || []
  )
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([])
  const [vinLookupLoading, setVinLookupLoading] = useState(false)

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
          setNewPhotoPreviews(data.photos.slice(0, 10)) // Limit to 10 photos
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
    setNewPhotos((prev) => [...prev, ...files])

    // Create previews for new files only (preserve existing Auto.dev URLs)
    const newPreviews: string[] = []
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === files.length) {
          // Append new file previews to existing previews (which may include Auto.dev URLs)
          setNewPhotoPreviews((prev) => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveExistingPhoto = async (photoUrl: string) => {
    try {
      // Remove from database
      const { error } = await supabase
        .from('vehicle_photos')
        .delete()
        .eq('file_path', photoUrl)
        .eq('vehicle_id', vehicleId)

      if (error) throw error

      setExistingPhotos((prev) => prev.filter((url) => url !== photoUrl))
      showToast('Photo removed', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to remove photo', 'error')
    }
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

      if (formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
        showToast('Please enter a valid year', 'error')
        setLoading(false)
        return
      }

      // Update vehicle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          vin: formData.vin || null,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          price_per_day: formData.price_per_day,
          location: formData.location,
          description: formData.description || null,
          mileage_limit: formData.mileage_limit,
          status: formData.status,
        })
        .eq('id', vehicleId)

      if (vehicleError) throw vehicleError

      // Handle new photos: Auto.dev URLs and uploaded files
      const photoUrls: string[] = []

      // Add Auto.dev photos (from newPhotoPreviews that are URLs)
      const autoDevPhotos = newPhotoPreviews.filter((preview) => preview.startsWith('http'))
      if (autoDevPhotos.length > 0) {
        photoUrls.push(...autoDevPhotos)
      }

      // Upload user-uploaded photos
      if (newPhotos.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const timestamp = Date.now()
        for (let i = 0; i < newPhotos.length; i++) {
          const path = `${user.id}/vehicles/${vehicleId}/${timestamp}-${i}.jpg`
          const url = await uploadFile(newPhotos[i], path)
          photoUrls.push(url)
        }
      }

      // Create vehicle_photos records
      if (photoUrls.length > 0) {
        const { error: photosError } = await supabase.from('vehicle_photos').insert(
          photoUrls.map((url) => ({
            vehicle_id: vehicleId,
            file_path: url,
          }))
        )

        if (photosError) throw photosError
      }

      showToast('Vehicle updated successfully!', 'success')
      router.push('/dealer/vehicles')
    } catch (error: any) {
      console.error('Error updating vehicle:', error)
      showToast(error.message || 'Failed to update vehicle', 'error')
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            placeholder="e.g., Camry"
          />
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            id="year"
            type="number"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            required
            min="1900"
            max={new Date().getFullYear() + 1}
            className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          />
        </div>

        <div>
          <label htmlFor="price_per_day" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
            Price per Day ($) <span className="text-red-500">*</span>
          </label>
          <input
            id="price_per_day"
            type="number"
            name="price_per_day"
            value={formData.price_per_day}
            onChange={handleInputChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
          />
        </div>

        <AddressInput
          id="location"
          name="location"
          value={formData.location}
          onChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
          placeholder="e.g., Los Angeles, CA"
          required
          label="Location"
        />

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
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Existing Photos
        </label>
        {existingPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {existingPhotos.map((photoUrl, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={photoUrl}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-brand-gray dark:border-brand-navy"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingPhoto(photoUrl)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-4">No photos</p>
        )}
      </div>

      <div>
        <label htmlFor="new-photos" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Add New Photos (optional)
        </label>
        <input
          id="new-photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white"
        />
        {newPhotoPreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {newPhotoPreviews.map((preview, idx) => (
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
          {loading ? 'Updating...' : 'Update Vehicle'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dealer/vehicles')}
          className="px-6 py-3 bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white border border-brand-gray dark:border-brand-navy rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
