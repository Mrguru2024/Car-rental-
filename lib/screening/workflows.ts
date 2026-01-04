/**
 * Screening Workflows
 * Business logic for MVR and Soft Credit screening
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getScreeningProvider } from './providers'
import { logAuditEvent } from '@/lib/security/auditLog'

export interface ScreeningWorkflowResult {
  screening_id: string
  status: 'requested' | 'pending' | 'complete' | 'failed'
  result?: 'pass' | 'conditional' | 'fail'
  risk_level?: 'low' | 'medium' | 'high'
}

/**
 * Check if user has accepted a policy
 */
export async function hasPolicyAcceptance(
  userId: string,
  policyKey: string,
  policyVersion: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('policy_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('policy_key', policyKey)
    .eq('policy_version', policyVersion)
    .single()

  return !!data
}

/**
 * Record policy acceptance
 */
export async function recordPolicyAcceptance(
  userId: string,
  policyKey: string,
  policyVersion: string,
  ipHash?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('policy_acceptances').upsert(
    {
      user_id: userId,
      policy_key: policyKey,
      policy_version: policyVersion,
      ip_hash: ipHash,
      user_agent: userAgent,
    },
    {
      onConflict: 'user_id,policy_key,policy_version',
    }
  )
}

/**
 * Record screening consent
 */
export async function recordScreeningConsent(
  userId: string,
  bookingId: string | null,
  consentType: 'mvr' | 'soft_credit',
  policyKey: string,
  policyVersion: string,
  ipHash?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('screening_consents').upsert(
    {
      user_id: userId,
      booking_id: bookingId,
      consent_type: consentType,
      policy_key: policyKey,
      policy_version: policyVersion,
      ip_hash: ipHash,
      user_agent: userAgent,
    },
    {
      onConflict: 'user_id,booking_id,consent_type,policy_version',
    }
  )
}

/**
 * Run MVR Screening Workflow
 */
export async function runMvrScreening(
  renterId: string,
  bookingId: string | null,
  ipAddress?: string,
  userAgent?: string
): Promise<ScreeningWorkflowResult> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 1. Check consent
  const policyKey = 'renter_mvr_consent_v1'
  const policyVersion = '1.0'
  const hasConsent = await hasPolicyAcceptance(renterId, policyKey, policyVersion)

  if (!hasConsent) {
    throw new Error('MVR consent required before screening')
  }

  // 2. Get renter profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, user_id, drivers_license_number, drivers_license_state, drivers_license_expiration')
    .eq('id', renterId)
    .single()

  if (!profile) {
    throw new Error('Renter profile not found')
  }

  // Parse name (simple approach - in production, handle edge cases)
  const nameParts = (profile.full_name || '').split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  if (!profile.drivers_license_number || !profile.drivers_license_state) {
    throw new Error('Driver license information required for MVR screening')
  }

  // 3. Create screening record
  const provider = getScreeningProvider()
  // Determine provider name (mock by default for free-now build)
  const providerName = process.env.USE_CHECKR === 'true' ? 'checkr' : 'mock'

  const { data: screening, error: screeningError } = await adminSupabase
    .from('renter_screenings')
    .insert({
      renter_id: renterId,
      booking_id: bookingId,
      screening_type: 'mvr',
      provider: providerName,
      status: 'requested',
    })
    .select()
    .single()

  if (screeningError || !screening) {
    throw new Error('Failed to create screening record')
  }

  try {
    // 4. Request MVR from provider
    // Use date of birth if available, otherwise use a default (mock provider won't validate)
    const dateOfBirth = '1990-01-01' // In production, should be stored in profile

    const { provider_ref } = await provider.requestMvr({
      renterId,
      bookingId: bookingId || undefined,
      firstName,
      lastName,
      dateOfBirth,
      driversLicenseNumber: profile.drivers_license_number,
      driversLicenseState: profile.drivers_license_state,
    })

    // 5. Update screening with provider_ref
    await adminSupabase
      .from('renter_screenings')
      .update({
        provider_ref,
        status: 'pending',
      })
      .eq('id', screening.id)

    // 6. Get result (for mock provider, this is immediate; for real providers, would poll)
    const result = await provider.getResult(provider_ref, 'mvr')

    // 7. Update screening with result
    const updateData: any = {
      status: result.status,
      signals: result.signals,
    }

    if (result.result) {
      updateData.result = result.result
    }
    if (result.risk_level) {
      updateData.risk_level = result.risk_level
    }

    await adminSupabase.from('renter_screenings').update(updateData).eq('id', screening.id)

    // 8. Record audit log
    await logAuditEvent({
      user_id: renterId,
      action: 'SCREENING_MVR_COMPLETED',
      resource_type: 'screening',
      resource_id: screening.id,
      details: {
        booking_id: bookingId,
        result: result.result,
        risk_level: result.risk_level,
        provider: providerName,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    // 9. Handle adverse action if needed
    if (result.result === 'fail' && result.signals.fraud_risk === 'high') {
      // Scaffold: create adverse action record
      await adminSupabase.from('adverse_actions').insert({
        renter_id: renterId,
        booking_id: bookingId,
        reason_codes: ['fraud_risk_high'],
        provider: providerName,
        notice_status: 'draft',
      })
    }

    return {
      screening_id: screening.id,
      status: result.status,
      result: result.result,
      risk_level: result.risk_level,
    }
  } catch (error: any) {
    // Update screening status to failed
    await adminSupabase
      .from('renter_screenings')
      .update({
        status: 'failed',
      })
      .eq('id', screening.id)

    await logAuditEvent({
      user_id: renterId,
      action: 'SCREENING_MVR_FAILED',
      resource_type: 'screening',
      resource_id: screening.id,
      details: {
        booking_id: bookingId,
        error: error.message,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_message: error.message,
    })

    throw error
  }
}

/**
 * Run Soft Credit Screening Workflow
 */
export async function runSoftCreditScreening(
  renterId: string,
  bookingId: string | null,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ScreeningWorkflowResult> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 1. Check consent
  const policyKey = 'renter_soft_credit_consent_v1'
  const policyVersion = '1.0'
  const hasConsent = await hasPolicyAcceptance(renterId, policyKey, policyVersion)

  if (!hasConsent) {
    throw new Error('Soft credit consent required before screening')
  }

  // 2. Get renter profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, user_id')
    .eq('id', renterId)
    .single()

  if (!profile) {
    throw new Error('Renter profile not found')
  }

  // Get auth user for email
  const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
  const email = authUser?.user?.email || ''

  // Parse name
  const nameParts = (profile.full_name || '').split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  // 3. Create screening record
  const provider = getScreeningProvider()
  // Determine provider name (mock by default for free-now build)
  const providerName = process.env.USE_CHECKR === 'true' ? 'checkr' : 'mock'

  const { data: screening, error: screeningError } = await adminSupabase
    .from('renter_screenings')
    .insert({
      renter_id: renterId,
      booking_id: bookingId,
      screening_type: 'soft_credit',
      provider: providerName,
      status: 'requested',
      signals: { reason }, // Store reason in signals
    })
    .select()
    .single()

  if (screeningError || !screening) {
    throw new Error('Failed to create screening record')
  }

  try {
    // 4. Request soft credit from provider
    const dateOfBirth = '1990-01-01' // In production, should be stored in profile

    const { provider_ref } = await provider.requestSoftCredit({
      renterId,
      bookingId: bookingId || undefined,
      firstName,
      lastName,
      dateOfBirth,
      email,
    })

    // 5. Update screening with provider_ref
    await adminSupabase
      .from('renter_screenings')
      .update({
        provider_ref,
        status: 'pending',
      })
      .eq('id', screening.id)

    // 6. Get result
    const result = await provider.getResult(provider_ref, 'soft_credit')

    // 7. Update screening with result
    const updateData: any = {
      status: result.status,
      signals: { ...result.signals, reason },
    }

    if (result.result) {
      updateData.result = result.result
    }
    if (result.risk_level) {
      updateData.risk_level = result.risk_level
    }

    await adminSupabase.from('renter_screenings').update(updateData).eq('id', screening.id)

    // 8. Record audit log
    await logAuditEvent({
      user_id: renterId,
      action: 'SCREENING_SOFT_CREDIT_COMPLETED',
      resource_type: 'screening',
      resource_id: screening.id,
      details: {
        booking_id: bookingId,
        result: result.result,
        risk_level: result.risk_level,
        provider: providerName,
        reason,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })

    // 9. Handle adverse action if needed (if based on consumer report)
    if (result.result === 'fail') {
      await adminSupabase.from('adverse_actions').insert({
        renter_id: renterId,
        booking_id: bookingId,
        reason_codes: ['credit_risk_high'],
        provider: providerName,
        notice_status: 'draft',
      })
    }

    return {
      screening_id: screening.id,
      status: result.status,
      result: result.result,
      risk_level: result.risk_level,
    }
  } catch (error: any) {
    // Update screening status to failed
    await adminSupabase
      .from('renter_screenings')
      .update({
        status: 'failed',
      })
      .eq('id', screening.id)

    await logAuditEvent({
      user_id: renterId,
      action: 'SCREENING_SOFT_CREDIT_FAILED',
      resource_type: 'screening',
      resource_id: screening.id,
      details: {
        booking_id: bookingId,
        error: error.message,
        reason,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_message: error.message,
    })

    throw error
  }
}

/**
 * Get screening summary for a renter and optional booking
 */
export async function getScreeningSummary(
  renterId: string,
  bookingId?: string | null
): Promise<{
  mvr?: {
    status: string
    result?: string
    risk_level?: string
  }
  soft_credit?: {
    status: string
    result?: string
    risk_level?: string
  }
}> {
  const supabase = await createClient()

  let query = supabase.from('renter_screenings').select('screening_type, status, result, risk_level').eq('renter_id', renterId)

  if (bookingId) {
    query = query.or(`booking_id.is.null,booking_id.eq.${bookingId}`)
  }

  const { data: screenings } = await query

  const summary: any = {}

  screenings?.forEach((screening: any) => {
    if (screening.screening_type === 'mvr') {
      summary.mvr = {
        status: screening.status,
        result: screening.result,
        risk_level: screening.risk_level,
      }
    } else if (screening.screening_type === 'soft_credit') {
      summary.soft_credit = {
        status: screening.status,
        result: screening.result,
        risk_level: screening.risk_level,
      }
    }
  })

  return summary
}
