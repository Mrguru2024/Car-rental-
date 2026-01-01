/**
 * Data Masking Utilities
 * Masks sensitive data in logs, responses, and error messages
 */

/**
 * Mask PII (Personally Identifiable Information) in objects
 */
export function maskPII(data: any, fieldsToMask: string[] = []): any {
  const defaultFields = [
    'email',
    'phone',
    'ssn',
    'drivers_license_number',
    'credit_card',
    'card_number',
    'cvv',
    'password',
    'api_key',
    'secret',
    'token',
  ]

  const fields = [...defaultFields, ...fieldsToMask]

  if (typeof data !== 'object' || data === null) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => maskPII(item, fieldsToMask))
  }

  const masked: any = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    const shouldMask = fields.some(field => lowerKey.includes(field.toLowerCase()))

    if (shouldMask && typeof value === 'string' && value.length > 0) {
      // Mask the value
      if (lowerKey.includes('email')) {
        masked[key] = maskEmail(value)
      } else if (lowerKey.includes('phone')) {
        masked[key] = maskPhone(value)
      } else if (lowerKey.includes('ssn') || lowerKey.includes('license')) {
        masked[key] = maskLastFour(value)
      } else if (lowerKey.includes('card') || lowerKey.includes('cvv')) {
        masked[key] = maskCardNumber(value)
      } else {
        masked[key] = '***MASKED***'
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskPII(value, fieldsToMask)
    } else {
      masked[key] = value
    }
  }

  return masked
}

/**
 * Mask email address
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  if (local.length <= 2) return `${local[0]}*@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

/**
 * Mask phone number
 */
function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 4) return '***'
  return `(XXX) XXX-${cleaned.slice(-4)}`
}

/**
 * Mask last 4 digits (for SSN, license, etc.)
 */
function maskLastFour(value: string): string {
  if (value.length <= 4) return 'XXXX'
  return `XXXX${value.slice(-4)}`
}

/**
 * Mask credit card number
 */
function maskCardNumber(card: string): string {
  const cleaned = card.replace(/\D/g, '')
  if (cleaned.length < 4) return '****'
  return `****-****-****-${cleaned.slice(-4)}`
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: Error | unknown): string {
  if (error instanceof Error) {
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      // Return generic error message
      return 'An error occurred. Please try again or contact support.'
    }
    // In development, return full error
    return error.message
  }
  return 'An unexpected error occurred'
}
