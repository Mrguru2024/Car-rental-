/**
 * Policy Acceptance Helpers
 * Extends screening workflows policy acceptance to support context
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PolicyContextType = 'booking' | 'vehicle' | 'global' | 'complaint' | 'review' | null

export interface PolicyAcceptanceCheck {
  policy_key: string
  policy_version: string
  context_type?: PolicyContextType
  context_id?: string | null
  role?: string
}

/**
 * Check if user has accepted a policy (with context support)
 */
export async function hasPolicyAcceptance(
  userId: string,
  policyKey: string,
  policyVersion: string,
  contextType?: PolicyContextType,
  contextId?: string | null,
  role?: string
): Promise<boolean> {
  const supabase = await createClient()
  
  let query = supabase
    .from('policy_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('policy_key', policyKey)
    .eq('policy_version', policyVersion)

  if (contextType !== undefined) {
    query = query.eq('context_type', contextType)
  } else {
    query = query.is('context_type', null)
  }

  if (contextId !== undefined) {
    if (contextId === null) {
      query = query.is('context_id', null)
    } else {
      query = query.eq('context_id', contextId)
    }
  } else {
    // If contextType is provided but contextId is not, check for null context_id
    if (contextType !== undefined && contextType !== 'global') {
      query = query.is('context_id', null)
    }
  }

  if (role !== undefined) {
    query = query.eq('role', role)
  }

  const { data } = await query.single()

  return !!data
}

/**
 * Record policy acceptance (with context support)
 */
export async function recordPolicyAcceptance(
  userId: string,
  policyKey: string,
  policyVersion: string,
  contextType?: PolicyContextType,
  contextId?: string | null,
  role?: string,
  ipHash?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient()
  
  const insertData: any = {
    user_id: userId,
    policy_key: policyKey,
    policy_version: policyVersion,
  }

  if (contextType !== undefined) {
    insertData.context_type = contextType
  }

  if (contextId !== undefined) {
    insertData.context_id = contextId
  }

  if (role !== undefined) {
    insertData.role = role
  }

  if (ipHash !== undefined) {
    insertData.ip_hash = ipHash
  }

  if (userAgent !== undefined) {
    insertData.user_agent = userAgent
  }

  await supabase.from('policy_acceptances').upsert(insertData, {
    onConflict: 'user_id,policy_key,policy_version,context_type,context_id',
  })
}

/**
 * Require policy acceptance (throws if not accepted)
 */
export async function requireAcceptance(
  userId: string,
  policyKey: string,
  policyVersion: string,
  contextType?: PolicyContextType,
  contextId?: string | null,
  role?: string
): Promise<void> {
  const accepted = await hasPolicyAcceptance(userId, policyKey, policyVersion, contextType, contextId, role)
  if (!accepted) {
    throw new Error(`Policy acceptance required: ${policyKey} v${policyVersion}`)
  }
}
