/**
 * Insurance & Document Compliance
 * Automated checks and enforcement
 */

import { createClient } from '@/lib/supabase/server'

export interface InsuranceCheckResult {
  isValid: boolean
  status: 'valid' | 'expired' | 'missing'
  expiresOn?: Date
  reason?: string
}

/**
 * Check insurance status for a user
 */
export async function checkInsuranceStatus(userId: string): Promise<InsuranceCheckResult> {
  const supabase = await createClient()

  const { data: insurance } = await supabase
    .from('insurance_records')
    .select('status, expires_on')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!insurance) {
    return {
      isValid: false,
      status: 'missing',
      reason: 'No insurance record found',
    }
  }

  if (insurance.status === 'expired') {
    return {
      isValid: false,
      status: 'expired',
      reason: 'Insurance has expired',
    }
  }

  if (insurance.expires_on) {
    const expiresOn = new Date(insurance.expires_on)
    const now = new Date()

    if (expiresOn <= now) {
      // Update status to expired
      await supabase
        .from('insurance_records')
        .update({ status: 'expired' })
        .eq('user_id', userId)

      return {
        isValid: false,
        status: 'expired',
        expiresOn,
        reason: 'Insurance has expired',
      }
    }
  }

  return {
    isValid: insurance.status === 'valid',
    status: insurance.status as 'valid' | 'expired' | 'missing',
    expiresOn: insurance.expires_on ? new Date(insurance.expires_on) : undefined,
  }
}

/**
 * Auto-pause listings when insurance expires
 */
export async function autoPauseListingsForExpiredInsurance(userId: string): Promise<void> {
  const supabase = await createClient()
  const insuranceCheck = await checkInsuranceStatus(userId)

  if (!insuranceCheck.isValid) {
    // Pause all active listings for this user
    await supabase
      .from('vehicles')
      .update({ status: 'inactive' })
      .eq('dealer_id', userId)
      .eq('status', 'active')
  }
}

/**
 * Update insurance record
 */
export async function updateInsuranceRecord(
  userId: string,
  data: {
    policy_number?: string
    expires_on?: string
    document_url?: string
  }
): Promise<void> {
  const supabase = await createClient()

  const expiresOn = data.expires_on ? new Date(data.expires_on) : null
  const status =
    !expiresOn || expiresOn <= new Date()
      ? 'expired'
      : expiresOn > new Date()
      ? 'valid'
      : 'missing'

  await supabase.from('insurance_records').upsert(
    {
      user_id: userId,
      policy_number: data.policy_number,
      expires_on: data.expires_on,
      document_url: data.document_url,
      status,
    },
    {
      onConflict: 'user_id',
    }
  )

  // Recompute verification if insurance was updated
  if (status === 'valid') {
    const { computeVerificationForUser } = await import('@/lib/verification/computeVerification')
    await computeVerificationForUser(userId)
  }
}
