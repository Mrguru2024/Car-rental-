/**
 * Vehicle Image Fallback System
 * Priority: Host uploads -> VinAudit -> Silhouette
 */

import { createClient } from '@/lib/supabase/server'
import { getVinAuditImage } from './providers/vinaudit'

export interface VehicleImageResult {
  url: string
  source: 'host_upload' | 'vinaudit' | 'fallback'
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

  // Step 2: Check cache for VinAudit images
  const vehicleKey = `${year}-${make}-${model}`.toLowerCase().replace(/\s+/g, '-')
  const keyHash = await hashString(vehicleKey)

  const { data: cachedImage } = await supabase
    .from('vehicle_image_map')
    .select('image_urls, provider')
    .eq('vehicle_key_hash', keyHash)
    .single()

  if (cachedImage && cachedImage.image_urls && Array.isArray(cachedImage.image_urls) && cachedImage.image_urls.length > 0) {
    return {
      url: cachedImage.image_urls[0] as string,
      source: cachedImage.provider as 'vinaudit' | 'fallback',
    }
  }

  // Step 3: Try VinAudit API
  try {
    const vinauditImage = await getVinAuditImage(make, model, year)
    if (vinauditImage) {
      // Cache the result
      await supabase.from('vehicle_image_map').upsert(
        {
          vehicle_key_hash: keyHash,
          provider: 'vinaudit',
          image_urls: [vinauditImage],
        },
        {
          onConflict: 'vehicle_key_hash',
        }
      )

      return {
        url: vinauditImage,
        source: 'vinaudit',
      }
    }
  } catch (error) {
    console.error('VinAudit image fetch failed:', error)
  }

  // Step 4: Fallback to silhouette/placeholder
  const fallbackUrl = `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop`

  // Cache fallback
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
