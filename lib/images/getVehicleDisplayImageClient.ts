/**
 * Client-side version of getVehicleDisplayImage
 * For use in client components where server-side imports aren't available
 */

export interface VehicleImageResult {
  url: string
  source: 'host_upload' | 'autodev' | 'fallback'
}

/**
 * Get display image for a vehicle (client-side fallback)
 * Falls back to placeholder if no photos available
 */
export function getVehicleDisplayImageClient(
  vehiclePhotos?: Array<{ file_path: string }>
): VehicleImageResult {
  if (vehiclePhotos && vehiclePhotos.length > 0 && vehiclePhotos[0].file_path) {
    return {
      url: vehiclePhotos[0].file_path,
      source: 'host_upload',
    }
  }

  // Fallback to placeholder
  return {
    url: `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop`,
    source: 'fallback',
  }
}
