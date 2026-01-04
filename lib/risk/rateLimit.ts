/**
 * Rate Limiting for Fraud Prevention
 * Basic in-memory implementation for MVP
 */

import { createClient } from '@/lib/supabase/server'

export type RateLimitAction =
  | 'booking_attempt'
  | 'verification_submit'
  | 'listing_create'
  | 'vin_lookup'
  | 'api_makes'
  | 'api_models'
  | 'autodev_photos'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

const RATE_LIMIT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  booking_attempt: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  verification_submit: {
    maxAttempts: 5,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  listing_create: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  vin_lookup: {
    maxAttempts: 50, // 50 VIN lookups per hour per user/IP
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  api_makes: {
    maxAttempts: 100, // Makes list can be cached, higher limit
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  api_models: {
    maxAttempts: 200, // Models list can be cached, higher limit
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  autodev_photos: {
    maxAttempts: 100, // Auto.dev photos - limit to prevent excessive API usage
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  recall_lookup: {
    maxAttempts: 30, // Recall lookups - limit to prevent excessive NHTSA API calls
    windowMs: 60 * 60 * 1000, // 1 hour
  },
}

/**
 * Check if an action is rate limited
 */
export async function checkRateLimit(
  identifier: string, // user_id or IP address
  action: RateLimitAction
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const supabase = await createClient()
  const config = RATE_LIMIT_CONFIGS[action]
  const windowStart = new Date(Date.now() - config.windowMs)

  // Clean up old entries
  await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', windowStart.toISOString())

  // Count attempts in current window
  const { data: attempts, error } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('identifier', identifier)
    .eq('action_type', action)
    .gte('window_start', windowStart.toISOString())

  if (error) {
    // On error, fail open for MVP (log and allow)
    console.error('Rate limit check error:', error)
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(Date.now() + config.windowMs),
    }
  }

  const totalAttempts = attempts?.reduce((sum, a) => sum + a.count, 0) || 0
  const remaining = Math.max(0, config.maxAttempts - totalAttempts)
  const allowed = totalAttempts < config.maxAttempts

  return {
    allowed,
    remaining,
    resetAt: new Date(Date.now() + config.windowMs),
  }
}

/**
 * Record a rate limit attempt
 */
export async function recordRateLimitAttempt(
  identifier: string,
  action: RateLimitAction
): Promise<void> {
  const supabase = await createClient()
  const windowStart = new Date()
  windowStart.setMinutes(0, 0, 0) // Round to hour for windowing

  // Upsert: increment count or create new entry
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('id, count')
    .eq('identifier', identifier)
    .eq('action_type', action)
    .eq('window_start', windowStart.toISOString())
    .single()

  if (existing) {
    await supabase
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: action,
      count: 1,
      window_start: windowStart.toISOString(),
    })
  }
}
