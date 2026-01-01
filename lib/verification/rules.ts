/**
 * Automated Verification Rules Engine
 * Fail-closed logic: If any required check fails, status = restricted
 */

export interface VerificationRuleResult {
  passed: boolean
  reason?: string
}

export interface VerificationContext {
  userId: string
  userType: 'renter' | 'dealer' | 'private_host'
  hasRequiredDocuments: boolean
  hasValidInsurance: boolean
  phoneVerified: boolean
  emailVerified: boolean
  stripeRiskLevel?: 'normal' | 'elevated' | 'highest'
}

/**
 * Rule: Required documents must be uploaded
 */
export function checkRequiredDocuments(context: VerificationContext): VerificationRuleResult {
  if (!context.hasRequiredDocuments) {
    return {
      passed: false,
      reason: 'Required verification documents are missing',
    }
  }
  return { passed: true }
}

/**
 * Rule: Insurance must be valid (for dealers and private hosts)
 */
export function checkInsurance(context: VerificationContext): VerificationRuleResult {
  if (context.userType === 'renter') {
    return { passed: true } // Renters don't need insurance
  }

  if (!context.hasValidInsurance) {
    return {
      passed: false,
      reason: 'Valid insurance is required for hosts',
    }
  }
  return { passed: true }
}

/**
 * Rule: Phone must be verified
 */
export function checkPhoneVerification(context: VerificationContext): VerificationRuleResult {
  if (!context.phoneVerified) {
    return {
      passed: false,
      reason: 'Phone number must be verified',
    }
  }
  return { passed: true }
}

/**
 * Rule: Email must be verified
 */
export function checkEmailVerification(context: VerificationContext): VerificationRuleResult {
  if (!context.emailVerified) {
    return {
      passed: false,
      reason: 'Email address must be verified',
    }
  }
  return { passed: true }
}

/**
 * Rule: Stripe risk level must be acceptable
 */
export function checkStripeRisk(context: VerificationContext): VerificationRuleResult {
  if (context.stripeRiskLevel === 'highest') {
    return {
      passed: false,
      reason: 'Account flagged for high risk',
    }
  }
  return { passed: true }
}

/**
 * All verification rules
 */
export const VERIFICATION_RULES = [
  checkRequiredDocuments,
  checkInsurance,
  checkPhoneVerification,
  checkEmailVerification,
  checkStripeRisk,
]

/**
 * Determine verification status based on rule results
 */
export function computeStatus(ruleResults: VerificationRuleResult[]): {
  status: 'verified' | 'restricted' | 'rejected' | 'pending'
  reasons: string[]
} {
  const failedRules = ruleResults.filter((r) => !r.passed)
  const reasons = failedRules.map((r) => r.reason!).filter(Boolean)

  if (failedRules.length === 0) {
    return { status: 'verified', reasons: [] }
  }

  // If critical rules fail (documents, insurance for hosts), status is restricted
  const criticalFailures = failedRules.filter((r) =>
    r.reason?.includes('documents') || r.reason?.includes('insurance')
  )

  if (criticalFailures.length > 0) {
    return { status: 'restricted', reasons }
  }

  // Other failures result in pending (can be fixed)
  return { status: 'pending', reasons }
}
