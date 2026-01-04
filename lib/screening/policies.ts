/**
 * Screening Policy Content
 * Policy texts for consent modals
 */

export const SCREENING_POLICIES = {
  renter_mvr_consent_v1: {
    key: 'renter_mvr_consent_v1',
    version: '1.0',
    title: 'Motor Vehicle Record (MVR) Consent',
    content: `
By accepting this consent, you authorize our platform to obtain your Motor Vehicle Record (MVR) 
from the appropriate state Department of Motor Vehicles (DMV) or authorized third-party screening provider.

**What we check:**
- Current license status (valid, suspended, expired)
- Major traffic violations
- Driving history indicators

**How we use this information:**
- To assess your eligibility to rent vehicles on our platform
- To protect vehicle owners and other users
- To comply with insurance requirements

**Your rights:**
- You can request a copy of your screening results
- You have the right to dispute inaccurate information
- This is a one-time check per booking (results may be reused for future bookings within a reasonable period)

**Outcomes:**
- **PASS**: Your booking can proceed normally
- **CONDITIONAL**: Your booking may proceed with additional restrictions (deposit, vehicle tier limits)
- **FAIL**: Your booking request cannot be approved at this time

By clicking "Accept", you acknowledge that you have read and understand this consent.
    `.trim(),
  },
  renter_soft_credit_consent_v1: {
    key: 'renter_soft_credit_consent_v1',
    version: '1.0',
    title: 'Soft Credit Check Consent',
    content: `
By accepting this consent, you authorize our platform to perform a soft credit inquiry through 
authorized screening providers. This is a "soft" inquiry that will NOT affect your credit score.

**What we check:**
- Payment behavior indicators
- Credit risk assessment (not your full credit report)
- Fraud risk indicators

**How we use this information:**
- To assess risk for high-value or long-duration rentals
- To determine if additional security deposits are needed
- To protect vehicle owners from financial risk

**Your rights:**
- This is a soft inquiry (no impact on credit score)
- You can request a copy of your screening results
- You have the right to dispute inaccurate information
- If adverse action is taken based on consumer report information, you will receive proper notice

**Outcomes:**
- **PASS**: Your booking can proceed normally
- **CONDITIONAL**: Additional deposit or vehicle restrictions may apply
- **FAIL**: Your booking request cannot be approved (you will receive adverse action notice if applicable)

By clicking "Accept", you acknowledge that you have read and understand this consent.
    `.trim(),
  },
  screening_disclaimer_v1: {
    key: 'screening_disclaimer_v1',
    version: '1.0',
    title: 'Screening Disclaimer',
    content: `
**Screening Outcomes Explained:**

- **PASS**: All checks passed. Your booking can proceed normally.

- **CONDITIONAL**: Some concerns were identified. Your booking may proceed with:
  - Additional security deposit
  - Restrictions on vehicle tiers (luxury/exotic vehicles)
  - Shorter maximum rental duration

- **FAIL**: Significant concerns identified. Your booking request cannot be approved at this time.
  If this decision was based on information from a consumer reporting agency, you will receive
  an adverse action notice with details on how to dispute or obtain a free copy of your report.

**Appeals:**
If you believe a screening result is inaccurate, please contact support with documentation.
Admins can review and override decisions in appropriate circumstances.

All screening decisions are made automatically based on objective criteria. Human review is
available for appeals and edge cases.
    `.trim(),
  },
}

export function getPolicy(key: string, version: string) {
  return SCREENING_POLICIES[key as keyof typeof SCREENING_POLICIES]
}
