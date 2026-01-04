/**
 * NHTSA Recalls API Integration
 * FREE public API - no API key required
 * Base URL: https://api.nhtsa.gov/recalls
 * 
 * Different from vPIC API (used for VIN decoding)
 */

const NHTSA_RECALLS_BASE_URL = 'https://api.nhtsa.gov/recalls'

export interface NHTSARecall {
  NHTSACampaignNumber: string
  Make: string
  Model: string
  ModelYear: string
  Manufacturer: string
  ReportReceivedDate: string
  Component: string
  Summary: string
  Consequence: string
  Remedy: string
  Notes: string
  NHTSAActionNumber: string
}

export interface NHTSARecallsResponse {
  Count: number
  Message: string
  Results: NHTSARecall[]
}

/**
 * Get recalls by vehicle make, model, and year
 * 
 * @param make - Vehicle make (e.g., "Honda")
 * @param model - Vehicle model (e.g., "Civic")
 * @param modelYear - Model year (e.g., 2020)
 * @returns Array of recall records
 */
export async function getRecallsByVehicle(
  make: string,
  model: string,
  modelYear: number
): Promise<NHTSARecall[]> {
  try {
    const url = `${NHTSA_RECALLS_BASE_URL}/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${modelYear}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 1 hour (recalls don't change frequently)
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      // Handle NHTSA rate limiting
      if (response.status === 429) {
        throw new Error('NHTSA Recalls API rate limit exceeded. Please try again later.')
      }
      if (response.status === 404) {
        // No recalls found is a valid response
        return []
      }
      throw new Error(`NHTSA Recalls API error: ${response.status} ${response.statusText}`)
    }

    const data: NHTSARecallsResponse = await response.json()

    // Handle empty results
    if (!data.Results || data.Count === 0) {
      return []
    }

    return data.Results
  } catch (error) {
    console.error('Error fetching recalls from NHTSA:', error)
    throw error
  }
}

/**
 * Decode VIN using vPIC API to get make/model/year
 * Reuses existing NHTSA vPIC integration
 * 
 * @param vin - 17-character VIN
 * @returns Object with make, model, year or null if not found
 */
export async function decodeVINForRecalls(vin: string): Promise<{
  make: string
  model: string
  year: number
} | null> {
  try {
    // Import the existing vPIC decoder
    const { decodeVINExtended } = await import('@/lib/api/nhtsa')
    const decoded = await decodeVINExtended(vin)

    if (!decoded || !decoded['Make'] || !decoded['Model'] || !decoded['Model Year']) {
      return null
    }

    const year = Number.parseInt(decoded['Model Year'], 10)
    if (Number.isNaN(year)) {
      return null
    }

    return {
      make: decoded['Make'],
      model: decoded['Model'],
      year,
    }
  } catch (error) {
    console.error('Error decoding VIN for recalls:', error)
    return null
  }
}
