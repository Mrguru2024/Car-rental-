/**
 * Screening Provider Interface
 * Defines the contract for screening providers (Mock, Checkr, etc.)
 */

export interface MvrRequestInput {
  renterId: string
  bookingId?: string
  firstName: string
  lastName: string
  dateOfBirth: string // ISO date string
  driversLicenseNumber: string
  driversLicenseState: string
}

export interface SoftCreditRequestInput {
  renterId: string
  bookingId?: string
  firstName: string
  lastName: string
  dateOfBirth: string // ISO date string
  email?: string
  address?: {
    street: string
    city: string
    state: string
    zip: string
  }
}

export interface ScreeningResult {
  status: 'requested' | 'pending' | 'complete' | 'failed'
  result?: 'pass' | 'conditional' | 'fail'
  risk_level?: 'low' | 'medium' | 'high'
  signals: {
    // MVR signals
    license_status?: 'valid' | 'suspended' | 'expired' | 'unknown'
    major_violations_count?: number
    fraud_risk?: 'low' | 'medium' | 'high'
    // Soft credit signals
    credit_risk_score?: number
    payment_behavior?: 'good' | 'fair' | 'poor'
    [key: string]: any
  }
  provider_ref?: string
}

export interface ScreeningProvider {
  /**
   * Request an MVR (Motor Vehicle Record) check
   */
  requestMvr(input: MvrRequestInput): Promise<{ provider_ref: string }>

  /**
   * Request a soft credit check
   */
  requestSoftCredit(input: SoftCreditRequestInput): Promise<{ provider_ref: string }>

  /**
   * Get the result of a screening request
   */
  getResult(provider_ref: string, screeningType: 'mvr' | 'soft_credit'): Promise<ScreeningResult>
}
