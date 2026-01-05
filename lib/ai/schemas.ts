/**
 * Zod schemas for AI agent inputs and outputs
 * Ensures type safety and validation for all AI interactions
 */

import { z } from 'zod'

// Common schemas
export const RiskTierSchema = z.enum(['LOW', 'MEDIUM', 'ELEVATED', 'NEEDS_MANUAL_REVIEW'])
export const PatternLevelSchema = z.enum(['NONE', 'WEAK', 'MODERATE', 'STRONG'])
export const RetaliationRiskSchema = z.enum(['LOW', 'MEDIUM', 'HIGH'])
export const OpsActionSchema = z.enum(['NO_ACTION', 'WATCHLIST', 'MANUAL_REVIEW', 'REQUEST_MORE_INFO'])

// TrustGate AI Schemas
export const TrustGateInputSchema = z.object({
  task: z.literal('assess_booking_risk'),
  booking: z.object({
    booking_id: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    pickup_city: z.string(),
    duration_days: z.number(),
    estimated_value_usd: z.number(),
  }),
  vehicle: z.object({
    vehicle_id: z.string(),
    tier: z.string(),
    year: z.number(),
    replacement_cost_usd: z.number(),
  }),
  renter: z.object({
    renter_id: z.string(),
    identity_verification: z.string(),
    license_status: z.string(),
    prior_bookings_count: z.number(),
    prior_incidents_count: z.number(),
  }),
  history: z.object({
    chargeback_flags: z.number(),
    late_return_flags: z.number(),
    cancellations_last_90d: z.number(),
  }),
  reviews_summary: z.object({
    dealer_to_renter: z.object({
      count: z.number(),
      negative_count: z.number(),
      themes: z.array(z.string()),
    }),
    renter_to_dealer: z.object({
      count: z.number(),
      negative_count: z.number(),
      themes: z.array(z.string()),
    }),
  }),
})

export const TrustGateOutputSchema = z.object({
  decision: z.literal('ADVISORY_ONLY'),
  risk_tier: RiskTierSchema,
  recommended_conditions: z.array(z.string()),
  why: z.string(),
  missing_data: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

// Feedback Intelligence AI Schemas
export const FeedbackIntelligenceInputSchema = z.object({
  task: z.literal('analyze_review_signals'),
  entity_type: z.enum(['RENTER', 'DEALER', 'PLATFORM']),
  entity_id: z.string(),
  reviews: z.array(
    z.object({
      role_from: z.string(),
      role_to: z.string(),
      sentiment: z.string(),
      themes: z.array(z.string()),
      created_at: z.string(),
    })
  ),
})

export const FeedbackIntelligenceOutputSchema = z.object({
  pattern_level: PatternLevelSchema,
  signals: z.array(z.string()),
  retaliation_risk: RetaliationRiskSchema.optional(),
  recommended_ops_action: OpsActionSchema,
  notes: z.string(),
})

// DealerOps AI Schemas
export const DealerOpsInputSchema = z.object({
  task: z.literal('explain_booking_conditions_to_dealer'),
  dealer_name: z.string(),
  booking_id: z.string(),
  recommended_conditions: z.array(z.string()),
  context: z.object({
    vehicle_tier: z.string(),
    renter_history_summary: z.string(),
  }),
})

export const DealerOpsOutputSchema = z.object({
  message: z.string(),
  action_checklist: z.array(z.string()),
})

// EvidencePack AI Schemas
export const EvidencePackInputSchema = z.object({
  task: z.literal('build_dispute_evidence_pack'),
  booking_id: z.string(),
  reported_issue: z.string(),
  statements: z.object({
    dealer: z.string(),
    renter: z.string(),
  }),
  evidence: z.object({
    pickup_photos: z.array(z.string()),
    return_photos: z.array(z.string()),
    messages: z.array(z.string()),
    timestamps: z.object({
      pickup: z.string(),
      return: z.string(),
    }),
  }),
})

export const EvidencePackOutputSchema = z.object({
  timeline: z.array(
    z.object({
      timestamp: z.string(),
      event: z.string(),
      actor: z.string(),
    })
  ),
  summary: z.string(),
  missing_items: z.array(z.string()),
  next_steps: z.array(z.string()),
})

// Coverage Clarity AI Schemas
export const CoverageClarityInputSchema = z.object({
  task: z.literal('explain_coverage'),
  coverage_option: z.string(),
  booking_context: z.object({
    vehicle_tier: z.string(),
    duration_days: z.number(),
    estimated_value_usd: z.number(),
  }),
  role: z.enum(['renter', 'dealer']),
})

export const CoverageClarityOutputSchema = z.object({
  plain_language_explanation: z.string(),
  included: z.array(z.string()),
  excluded: z.array(z.string()),
  next_steps: z.array(z.string()),
  disclaimer: z.string(),
})

// Policy Sentinel AI Schemas
export const PolicySentinelInputSchema = z.object({
  task: z.literal('check_policy_compliance'),
  proposal_type: z.string(),
  proposal_text: z.string(),
  related_policy_rules: z.array(z.string()),
})

export const PolicySentinelOutputSchema = z.object({
  status: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'NEEDS_REVIEW']),
  violations: z.array(z.string()),
  risk_notes: z.string(),
  safe_rewrite_suggestions: z.array(z.string()),
})

// Type exports
export type TrustGateInput = z.infer<typeof TrustGateInputSchema>
export type TrustGateOutput = z.infer<typeof TrustGateOutputSchema>
export type FeedbackIntelligenceInput = z.infer<typeof FeedbackIntelligenceInputSchema>
export type FeedbackIntelligenceOutput = z.infer<typeof FeedbackIntelligenceOutputSchema>
export type DealerOpsInput = z.infer<typeof DealerOpsInputSchema>
export type DealerOpsOutput = z.infer<typeof DealerOpsOutputSchema>
export type EvidencePackInput = z.infer<typeof EvidencePackInputSchema>
export type EvidencePackOutput = z.infer<typeof EvidencePackOutputSchema>
export type CoverageClarityInput = z.infer<typeof CoverageClarityInputSchema>
export type CoverageClarityOutput = z.infer<typeof CoverageClarityOutputSchema>
export type PolicySentinelInput = z.infer<typeof PolicySentinelInputSchema>
export type PolicySentinelOutput = z.infer<typeof PolicySentinelOutputSchema>
