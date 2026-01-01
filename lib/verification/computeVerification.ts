/**
 * Automated Verification Computation
 * Computes verification status for a user based on all rules
 */

import { createClient } from '@/lib/supabase/server'
import { VERIFICATION_RULES, computeStatus, type VerificationContext } from './rules'

export interface VerificationResult {
  status: 'verified' | 'restricted' | 'rejected' | 'pending'
  reasons: string[]
}

/**
 * Compute verification status for a user
 */
export async function computeVerificationForUser(userId: string): Promise<VerificationResult> {
  const supabase = await createClient()

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, phone, user_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return {
      status: 'pending',
      reasons: ['User profile not found'],
    }
  }

  // Get auth user for email/phone verification
  const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)

  // Check for required documents
  const { data: documents } = await supabase
    .from('profiles')
    .select('verification_documents, verification_status')
    .eq('id', userId)
    .single()

  const hasRequiredDocuments = checkRequiredDocuments(profile.role, documents)

  // Check insurance (for dealers and private hosts)
  let hasValidInsurance = true
  if (profile.role === 'dealer' || profile.role === 'private_host') {
    const { data: insurance } = await supabase
      .from('insurance_records')
      .select('status, expires_on')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    hasValidInsurance =
      insurance?.status === 'valid' &&
      insurance?.expires_on &&
      new Date(insurance.expires_on) > new Date()
  }

  // Build verification context
  const context: VerificationContext = {
    userId,
    userType: profile.role as 'renter' | 'dealer' | 'private_host',
    hasRequiredDocuments,
    hasValidInsurance,
    phoneVerified: !!profile.phone && !!authUser?.user?.phone,
    emailVerified: !!authUser?.user?.email_confirmed_at,
    stripeRiskLevel: 'normal', // TODO: Integrate with Stripe Radar if available
  }

  // Run all rules
  const ruleResults = VERIFICATION_RULES.map((rule) => rule(context))

  // Compute final status
  const result = computeStatus(ruleResults)

  // Store verification state
  await supabase.from('verification_states').upsert(
    {
      user_id: userId,
      user_type: context.userType,
      status: result.status,
      reasons: result.reasons,
      computed_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  )

  return result
}

/**
 * Helper: Check if user has required documents based on role
 */
function checkRequiredDocuments(
  role: string,
  profileData: any
): boolean {
  if (role === 'renter') {
    // Renters need: driver's license front/back, selfie
    const docs = profileData?.verification_documents || {}
    return !!(
      docs.drivers_license_front &&
      docs.drivers_license_back &&
      docs.selfie
    )
  }

  if (role === 'dealer' || role === 'private_host') {
    // Hosts need: business license (dealers) or ID (private hosts), insurance
    const docs = profileData?.verification_documents || {}
    return !!(docs.identification || docs.business_license)
  }

  return false
}

/**
 * Get current verification status for a user (cached)
 */
export async function getVerificationStatus(userId: string): Promise<VerificationResult | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('verification_states')
    .select('status, reasons')
    .eq('user_id', userId)
    .single()

  if (!data) {
    return null
  }

  return {
    status: data.status as VerificationResult['status'],
    reasons: (data.reasons as string[]) || [],
  }
}
