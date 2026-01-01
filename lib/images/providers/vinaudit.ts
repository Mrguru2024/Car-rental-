/**
 * VinAudit Image API Adapter
 * Fast option for vehicle image fallback
 */

const VINAUDIT_API_KEY = process.env.VINAUDIT_API_KEY
const VINAUDIT_API_URL = 'https://api.vinaudit.com/v2'

/**
 * Get vehicle image from VinAudit API
 */
export async function getVinAuditImage(
  make: string,
  model: string,
  year: number
): Promise<string | null> {
  if (!VINAUDIT_API_KEY) {
    console.warn('VinAudit API key not configured')
    return null
  }

  try {
    // VinAudit API endpoint (adjust based on actual API documentation)
    const response = await fetch(
      `${VINAUDIT_API_URL}/images?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`,
      {
        headers: {
          'Authorization': `Bearer ${VINAUDIT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    // Adjust based on actual VinAudit API response structure
    if (data.images && data.images.length > 0) {
      return data.images[0].url || data.images[0]
    }

    return null
  } catch (error) {
    console.error('VinAudit API error:', error)
    return null
  }
}
