/**
 * Mock Screening Provider
 * Free-now implementation for testing/development
 * Returns deterministic outcomes based on test user patterns
 */

import type {
  ScreeningProvider,
  MvrRequestInput,
  SoftCreditRequestInput,
  ScreeningResult,
} from './types'

export class MockProvider implements ScreeningProvider {
  private results = new Map<string, ScreeningResult>()

  async requestMvr(input: MvrRequestInput): Promise<{ provider_ref: string }> {
    // Generate deterministic provider_ref
    const provider_ref = `mock_mvr_${input.renterId}_${Date.now()}`

    // Determine outcome based on test patterns
    const email = input.renterId // In real system, would fetch from profile
    const outcome = this.determineMvrOutcome(email)

    // Store result (in real system, would be async polling)
    this.results.set(provider_ref, {
      status: 'complete',
      result: outcome.result,
      risk_level: outcome.risk_level,
      signals: outcome.signals,
      provider_ref,
    })

    return { provider_ref }
  }

  async requestSoftCredit(input: SoftCreditRequestInput): Promise<{ provider_ref: string }> {
    // Generate deterministic provider_ref
    const provider_ref = `mock_credit_${input.renterId}_${Date.now()}`

    // Determine outcome based on test patterns
    const email = input.email || input.renterId
    const outcome = this.determineCreditOutcome(email)

    // Store result
    this.results.set(provider_ref, {
      status: 'complete',
      result: outcome.result,
      risk_level: outcome.risk_level,
      signals: outcome.signals,
      provider_ref,
    })

    return { provider_ref }
  }

  async getResult(
    provider_ref: string,
    screeningType: 'mvr' | 'soft_credit'
  ): Promise<ScreeningResult> {
    const result = this.results.get(provider_ref)

    if (!result) {
      // Simulate pending state for new requests
      return {
        status: 'pending',
        signals: {},
        provider_ref,
      }
    }

    return result
  }

  /**
   * Determine MVR outcome based on test user patterns
   * Patterns:
   * - Email contains "+fail" → FAIL
   * - Email contains "+conditional" → CONDITIONAL
   * - Otherwise → PASS
   */
  private determineMvrOutcome(emailOrId: string): {
    result: 'pass' | 'conditional' | 'fail'
    risk_level: 'low' | 'medium' | 'high'
    signals: ScreeningResult['signals']
  } {
    const normalized = emailOrId.toLowerCase()

    if (normalized.includes('+fail') || normalized.includes('_fail')) {
      return {
        result: 'fail',
        risk_level: 'high',
        signals: {
          license_status: 'suspended',
          major_violations_count: 3,
          fraud_risk: 'high',
        },
      }
    }

    if (normalized.includes('+conditional') || normalized.includes('_conditional')) {
      return {
        result: 'conditional',
        risk_level: 'medium',
        signals: {
          license_status: 'valid',
          major_violations_count: 1,
          fraud_risk: 'medium',
        },
      }
    }

    // Default: PASS
    return {
      result: 'pass',
      risk_level: 'low',
      signals: {
        license_status: 'valid',
        major_violations_count: 0,
        fraud_risk: 'low',
      },
    }
  }

  /**
   * Determine soft credit outcome based on test user patterns
   */
  private determineCreditOutcome(emailOrId: string): {
    result: 'pass' | 'conditional' | 'fail'
    risk_level: 'low' | 'medium' | 'high'
    signals: ScreeningResult['signals']
  } {
    const normalized = emailOrId.toLowerCase()

    if (normalized.includes('+fail') || normalized.includes('_fail')) {
      return {
        result: 'fail',
        risk_level: 'high',
        signals: {
          credit_risk_score: 350,
          payment_behavior: 'poor',
          fraud_risk: 'high',
        },
      }
    }

    if (normalized.includes('+conditional') || normalized.includes('_conditional')) {
      return {
        result: 'conditional',
        risk_level: 'medium',
        signals: {
          credit_risk_score: 620,
          payment_behavior: 'fair',
          fraud_risk: 'medium',
        },
      }
    }

    // Default: PASS
    return {
      result: 'pass',
      risk_level: 'low',
      signals: {
        credit_risk_score: 750,
        payment_behavior: 'good',
        fraud_risk: 'low',
      },
    }
  }
}
