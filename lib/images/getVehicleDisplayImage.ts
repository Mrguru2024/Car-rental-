/**
 * Vehicle Image Fallback System
 * Priority: Host uploads -> Auto.dev (if VIN available) -> Silhouette
 */

import { createClient } from '@/lib/supabase/server'
import { getVINPhotos } from '@/lib/api/autodev'

export interface VehicleImageResult {
  url: string
  source: 'host_upload' | 'autodev' | 'fallback'
}

/**
 * Get display image for a vehicle with fallback chain
 */
export async function getVehicleDisplayImage(
  vehicleId: string,
  make: string,
  model: string,
  year: number
): Promise<VehicleImageResult> {
  const supabase = await createClient()

  // Step 1: Check for host-uploaded photos
  const { data: photos } = await supabase
    .from('vehicle_photos')
    .select('file_path')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (photos && photos.length > 0 && photos[0].file_path) {
    return {
      url: photos[0].file_path,
      source: 'host_upload',
    }
  }

  // Step 2: Check if vehicle has VIN, then try Auto.dev
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('vin')
    .eq('id', vehicleId)
    .single()

  if (vehicle?.vin) {
    // Check cache for Auto.dev images
    const vehicleKey = `${year}-${make}-${model}-${vehicle.vin}`.toLowerCase().replace(/\s+/g, '-')
    const keyHash = await hashString(vehicleKey)

    const { data: cachedImage } = await supabase
      .from('vehicle_image_map')
      .select('image_urls, provider')
      .eq('vehicle_key_hash', keyHash)
      .single()

    if (cachedImage && cachedImage.image_urls && Array.isArray(cachedImage.image_urls) && cachedImage.image_urls.length > 0) {
      return {
        url: cachedImage.image_urls[0] as string,
        source: cachedImage.provider as 'autodev' | 'fallback',
      }
    }

    // Step 3: Try Auto.dev API with VIN
    try {
      const autoDevPhotos = await getVINPhotos(vehicle.vin)
      if (autoDevPhotos && autoDevPhotos.length > 0) {
        const firstPhotoUrl = autoDevPhotos[0].url
        
        // Cache the result
        await supabase.from('vehicle_image_map').upsert(
          {
            vehicle_key_hash: keyHash,
            provider: 'autodev',
            image_urls: autoDevPhotos.map(p => p.url),
          },
          {
            onConflict: 'vehicle_key_hash',
          }
        )

        return {
          url: firstPhotoUrl,
          source: 'autodev',
        }
      }
    } catch (error) {
      console.error('Auto.dev image fetch failed:', error)
    }
  }

  // Step 4: Fallback to silhouette/placeholder
  const fallbackUrl = `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop`

  // Cache fallback (using make/model/year key since no VIN)
  const vehicleKey = `${year}-${make}-${model}`.toLowerCase().replace(/\s+/g, '-')
  const keyHash = await hashString(vehicleKey)
  
  await supabase.from('vehicle_image_map').upsert(
    {
      vehicle_key_hash: keyHash,
      provider: 'fallback',
      image_urls: [fallbackUrl],
    },
    {
      onConflict: 'vehicle_key_hash',
    }
  )

  return {
    url: fallbackUrl,
    source: 'fallback',
  }
}

/**
 * Simple string hash function
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
}
