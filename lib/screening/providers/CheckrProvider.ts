/**
 * Checkr Provider (Scaffold)
 * Sandbox-ready implementation for production screening
 * Only enabled if CHECKR_API_KEY env var exists
 */

import type {
  ScreeningProvider,
  MvrRequestInput,
  SoftCreditRequestInput,
  ScreeningResult,
} from './types'

export class CheckrProvider implements ScreeningProvider {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.CHECKR_API_KEY || ''
    this.baseUrl = process.env.CHECKR_BASE_URL || 'https://api.checkr.com/v1'

    if (!this.apiKey) {
      throw new Error('CheckrProvider requires CHECKR_API_KEY environment variable')
    }
  }

  async requestMvr(input: MvrRequestInput): Promise<{ provider_ref: string }> {
    // TODO: Implement Checkr MVR request
    // This is a scaffold - implement when ready for production
    throw new Error('CheckrProvider.requestMvr not yet implemented')
  }

  async requestSoftCredit(input: SoftCreditRequestInput): Promise<{ provider_ref: string }> {
    // TODO: Implement Checkr soft credit request
    throw new Error('CheckrProvider.requestSoftCredit not yet implemented')
  }

  async getResult(
    provider_ref: string,
    screeningType: 'mvr' | 'soft_credit'
  ): Promise<ScreeningResult> {
    // TODO: Implement Checkr result retrieval
    throw new Error('CheckrProvider.getResult not yet implemented')
  }
}

/**
 * Check if Checkr provider is available (env vars configured)
 */
export function isCheckrAvailable(): boolean {
  return !!process.env.CHECKR_API_KEY
}
