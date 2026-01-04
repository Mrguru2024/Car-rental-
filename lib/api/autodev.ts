/**
 * Auto.dev API Integration
 * Provides VIN lookup and vehicle photo retrieval
 */

const AUTO_DEV_API_KEY = process.env.AUTO_DEV_API_KEY || ''
const AUTO_DEV_BASE_URL = 'https://api.auto.dev'

export interface AutoDevVINData {
  vin: string
  year?: number
  make?: string
  model?: string
  trim?: string
  bodyType?: string
  driveType?: string
  transmission?: string
  engine?: {
    cylinders?: number
    displacement?: number
    fuelType?: string
    horsepower?: number
  }
  colors?: {
    exterior?: string[]
    interior?: string[]
  }
  mpg?: {
    city?: number
    highway?: number
  }
  msrp?: number
}

export interface AutoDevPhoto {
  url: string
  angle?: string
  size?: string
}

export interface AutoDevPhotosResponse {
  data: {
    retail: AutoDevPhoto[]
    wholesale?: AutoDevPhoto[]
  }
}

/**
 * Fetch vehicle data by VIN
 * 
 * @example
 * ```ts
 * const result = await getVINData('3GCUDHEL3NG668790')
 * console.log(result?.make) // e.g., "Chevrolet"
 * ```
 */
export async function getVINData(vin: string): Promise<AutoDevVINData | null> {
  if (!AUTO_DEV_API_KEY) {
    throw new Error('AUTO_DEV_API_KEY is not configured')
  }

  try {
    const response = await fetch(`${AUTO_DEV_BASE_URL}/vin/${vin}`, {
      headers: {
        Authorization: `Bearer ${AUTO_DEV_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      // Handle Auto.dev rate limiting
      if (response.status === 429) {
        throw new Error('Auto.dev API rate limit exceeded. Please try again later.')
      }
      throw new Error(`Auto.dev API error: ${response.status} ${response.statusText}`)
    }

    // Auto.dev returns the data directly (e.g., { vin, make, model, year, ... })
    const data = await response.json()
    return data as AutoDevVINData
  } catch (error) {
    console.error('Error fetching VIN data from Auto.dev:', error)
    throw error
  }
}

/**
 * Fetch vehicle photos by VIN
 */
export async function getVINPhotos(vin: string): Promise<AutoDevPhoto[]> {
  if (!AUTO_DEV_API_KEY) {
    throw new Error('AUTO_DEV_API_KEY is not configured')
  }

  try {
    const response = await fetch(`${AUTO_DEV_BASE_URL}/photos/${vin}`, {
      headers: {
        Authorization: `Bearer ${AUTO_DEV_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Auto.dev API error: ${response.status} ${response.statusText}`)
    }

    const data: AutoDevPhotosResponse = await response.json()
    // Return retail photos, fallback to wholesale if retail is empty
    return data.data?.retail?.length > 0 ? data.data.retail : data.data?.wholesale || []
  } catch (error) {
    console.error('Error fetching VIN photos from Auto.dev:', error)
    throw error
  }
}

/**
 * Validate VIN format (basic validation)
 */
export function isValidVIN(vin: string): boolean {
  // VINs are 17 characters, alphanumeric (excluding I, O, Q)
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i
  return vinRegex.test(vin.trim())
}
