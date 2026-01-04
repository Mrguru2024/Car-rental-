/**
 * NHTSA (National Highway Traffic Safety Administration) API Integration
 * Primary VIN decoder and vehicle data source
 * Base URL: https://vpic.nhtsa.dot.gov/api/vehicles
 */

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles'

export interface NHTSAVINDecodeResult {
  Value: string
  ValueId: string
  Variable: string
  VariableId: number
}

export interface NHTSAVINResponse {
  Count: number
  Message: string
  SearchCriteria: string
  Results: NHTSAVINDecodeResult[]
}

export interface NHTSAMake {
  Make_ID: number
  Make_Name: string
}

export interface NHTSAModel {
  Make_ID: number
  Make_Name: string
  Model_ID: number
  Model_Name: string
}

export interface NHTSAMakeResponse {
  Count: number
  Message: string
  Results: NHTSAMake[]
}

export interface NHTSAModelResponse {
  Count: number
  Message: string
  Results: NHTSAModel[]
}

/**
 * Decode VIN Extended - Primary VIN decoder
 * 
 * @param vin - 17-character VIN
 * @param modelyear - Optional model year for better accuracy
 * @returns Decoded vehicle data
 */
export async function decodeVINExtended(
  vin: string,
  modelyear?: number
): Promise<Record<string, string> | null> {
  try {
    let url = `${NHTSA_BASE_URL}/DecodeVinExtended/${vin}?format=json`
    if (modelyear) {
      url += `&modelyear=${modelyear}`
    }

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Handle NHTSA rate limiting
      if (response.status === 429) {
        throw new Error('NHTSA API rate limit exceeded. Please try again later.')
      }
      throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`)
    }

    const data: NHTSAVINResponse = await response.json()

    if (data.Count === 0 || !data.Results || data.Results.length === 0) {
      return null
    }

    // Convert array of {Variable, Value} objects to a key-value map
    const decoded: Record<string, string> = {}
    data.Results.forEach((result) => {
      if (result.Variable && result.Value && result.Value !== 'Not Applicable') {
        decoded[result.Variable] = result.Value
      }
    })

    return decoded
  } catch (error) {
    console.error('Error decoding VIN with NHTSA:', error)
    throw error
  }
}

/**
 * Get all makes
 */
export async function getAllMakes(): Promise<NHTSAMake[]> {
  try {
    const response = await fetch(`${NHTSA_BASE_URL}/GetAllMakes?format=json`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`)
    }

    const data: NHTSAMakeResponse = await response.json()
    return data.Results || []
  } catch (error) {
    console.error('Error fetching makes from NHTSA:', error)
    throw error
  }
}

/**
 * Get models for a specific make (with caching)
 */
export async function getModelsForMake(make: string): Promise<NHTSAModel[]> {
  try {
    const response = await fetch(
      `${NHTSA_BASE_URL}/GetModelsForMake/${encodeURIComponent(make)}?format=json`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache control
        next: { revalidate: 86400 }, // Revalidate once per day
      }
    )

    if (!response.ok) {
      // Handle NHTSA rate limiting
      if (response.status === 429) {
        throw new Error('NHTSA API rate limit exceeded. Please try again later.')
      }
      throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`)
    }

    const data: NHTSAModelResponse = await response.json()
    return data.Results || []
  } catch (error) {
    console.error('Error fetching models from NHTSA:', error)
    throw error
  }
}

/**
 * Get models for make and year
 */
export async function getModelsForMakeYear(
  make: string,
  modelyear: number,
  vehicleType?: string
): Promise<NHTSAModel[]> {
  try {
    let url = `${NHTSA_BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${modelyear}?format=json`
    if (vehicleType) {
      url += `&vehicletype=${encodeURIComponent(vehicleType)}`
    }

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`)
    }

    const data: NHTSAModelResponse = await response.json()
    return data.Results || []
  } catch (error) {
    console.error('Error fetching models from NHTSA:', error)
    throw error
  }
}

/**
 * Normalize NHTSA decoded data to common format
 */
export function normalizeNHTSAData(decoded: Record<string, string>, vin: string): {
  make?: string
  model?: string
  year?: number
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
  vin: string
} {
  // Extract common fields from NHTSA response
  const make = decoded['Make'] || decoded['Manufacturer Name']
  const model = decoded['Model'] || decoded['Model Year']
  const yearStr = decoded['Model Year'] || decoded['Year']
  const year = yearStr ? Number.parseInt(yearStr, 10) : undefined
  const trim = decoded['Trim'] || decoded['Series'] || decoded['Trim/Level']
  const bodyType = decoded['Body Class'] || decoded['Vehicle Type']
  const driveType = decoded['Drive Type'] || decoded['Transmission Style']
  const transmission = decoded['Transmission Style'] || decoded['Transmission']
  
  // Engine information
  const cylindersStr = decoded['Engine Number of Cylinders']
  const displacementStr = decoded['Displacement (L)'] || decoded['Engine Displacement (L)']
  const fuelType = decoded['Fuel Type - Primary'] || decoded['Fuel Type']
  const horsepowerStr = decoded['Engine Brake (hp)'] || decoded['Engine Power (hp)']

  return {
    vin,
    make,
    model,
    year: year && !Number.isNaN(year) ? year : undefined,
    trim,
    bodyType,
    driveType,
    transmission,
    engine: {
      cylinders: cylindersStr ? Number.parseInt(cylindersStr, 10) : undefined,
      displacement: displacementStr ? Number.parseFloat(displacementStr) : undefined,
      fuelType,
      horsepower: horsepowerStr ? Number.parseInt(horsepowerStr, 10) : undefined,
    },
  }
}
