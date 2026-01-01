/**
 * Listing Activation Enforcement
 * Ensures listings can only be active if host meets requirements
 */

import { createClient } from '@/lib/supabase/server'
import { getVerificationStatus } from '@/lib/verification/computeVerification'

export interface ListingGateResult {
  canActivate: boolean
  reason?: string
  forcedStatus?: 'active' | 'inactive' | 'paused'
}

/**
 * Check if a listing can be activated based on host compliance
 */
export async function checkListingActivation(
  dealerId: string,
  requestedStatus: 'active' | 'inactive' | 'paused'
): Promise<ListingGateResult> {
  const supabase = await createClient()

  // Get host profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, verification_status')
    .eq('id', dealerId)
    .single()

  if (!profile) {
    return {
      canActivate: false,
      reason: 'Host profile not found',
      forcedStatus: 'inactive',
    }
  }

  // Get verification status
  const verification = await getVerificationStatus(dealerId)

  // Rule 1: Host must be verified
  if (!verification || verification.status !== 'verified') {
    if (requestedStatus === 'active') {
      return {
        canActivate: false,
        reason: 'Host verification required to activate listings',
        forcedStatus: 'inactive',
      }
    }
  }

  // Rule 2: Check insurance (for dealers and private hosts)
  if (profile.role === 'dealer' || profile.role === 'private_host') {
    const { data: insurance } = await supabase
      .from('insurance_records')
      .select('status, expires_on')
      .eq('user_id', dealerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const isInsuranceValid =
      insurance?.status === 'valid' &&
      insurance?.expires_on &&
      new Date(insurance.expires_on) > new Date()

    if (!isInsuranceValid && requestedStatus === 'active') {
      return {
        canActivate: false,
        reason: 'Valid insurance required to activate listings',
        forcedStatus: 'paused',
      }
    }
  }

  // All checks passed
  return {
    canActivate: true,
    forcedStatus: requestedStatus,
  }
}

/**
 * Enforce listing status based on compliance
 * Call this before saving a listing
 */
export async function enforceListingStatus(
  dealerId: string,
  requestedStatus: 'active' | 'inactive' | 'paused'
): Promise<'active' | 'inactive' | 'paused'> {
  const gateResult = await checkListingActivation(dealerId, requestedStatus)

  if (gateResult.forcedStatus) {
    return gateResult.forcedStatus
  }

  return requestedStatus
}
