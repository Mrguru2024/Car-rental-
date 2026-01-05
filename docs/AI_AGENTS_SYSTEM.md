# AI Agents System Documentation

## Overview

Carsera's AI Agents system provides advisory-only intelligence to improve trust, risk control, and operational clarity. **AI agents never approve/deny bookings, execute payouts, or make final decisions** - they only provide recommendations and explanations.

## Architecture

### Core Principles

1. **Advisory-Only**: AI outputs are recommendations, not decisions
2. **Auditable**: All AI calls are logged to Supabase with input/output JSON
3. **Server-Side Only**: All AI calls happen in Next.js API routes
4. **Type-Safe**: Zod schemas validate all inputs and outputs
5. **RLS Protected**: Row Level Security ensures users only see their own data

### Database Tables

- **`ai_runs`**: Audit log for all AI agent calls
- **`trustgate_recommendations`**: TrustGate AI risk assessments
- **`review_signals`**: Feedback Intelligence AI pattern detection

## Available Agents

### 1. TrustGate AI (`/api/ai/trustgate/assess`)

**Purpose**: Advisory-only booking risk assessment

**Access**: Renters, Dealers, Admins (for their own bookings)

**Input**:
```json
{
  "task": "assess_booking_risk",
  "booking": { "booking_id": "...", "start_date": "...", ... },
  "vehicle": { "vehicle_id": "...", "tier": "...", ... },
  "renter": { "renter_id": "...", "identity_verification": "...", ... },
  "history": { "chargeback_flags": 0, ... },
  "reviews_summary": { ... }
}
```

**Output**:
```json
{
  "decision": "ADVISORY_ONLY",
  "risk_tier": "LOW|MEDIUM|ELEVATED|NEEDS_MANUAL_REVIEW",
  "recommended_conditions": ["HOLD_DEPOSIT_USD_250", ...],
  "why": "...",
  "missing_data": [],
  "confidence": 0.72
}
```

### 2. Feedback Intelligence AI (`/api/ai/reviews/analyze`)

**Purpose**: Detect review patterns and operational signals

**Access**: Admins only

**Input**:
```json
{
  "task": "analyze_review_signals",
  "entity_type": "RENTER|DEALER|PLATFORM",
  "entity_id": "...",
  "reviews": [...]
}
```

**Output**:
```json
{
  "pattern_level": "NONE|WEAK|MODERATE|STRONG",
  "signals": [...],
  "retaliation_risk": "LOW|MEDIUM|HIGH",
  "recommended_ops_action": "NO_ACTION|WATCHLIST|MANUAL_REVIEW|REQUEST_MORE_INFO",
  "notes": "..."
}
```

### 3. DealerOps AI (`/api/ai/dealer/explain`)

**Purpose**: Explain policies and booking conditions to dealers

**Access**: Dealers, Admins

**Input**:
```json
{
  "task": "explain_booking_conditions_to_dealer",
  "dealer_name": "...",
  "booking_id": "...",
  "recommended_conditions": [...],
  "context": { ... }
}
```

**Output**:
```json
{
  "message": "...",
  "action_checklist": [...]
}
```

### 4. EvidencePack AI (`/api/ai/disputes/evidence-pack`)

**Purpose**: Structure dispute evidence into timeline and summary

**Access**: Admins only

**Input**:
```json
{
  "task": "build_dispute_evidence_pack",
  "booking_id": "...",
  "reported_issue": "...",
  "statements": { "dealer": "...", "renter": "..." },
  "evidence": { ... }
}
```

**Output**:
```json
{
  "timeline": [...],
  "summary": "...",
  "missing_items": [...],
  "next_steps": [...]
}
```

### 5. Coverage Clarity AI (`/api/ai/coverage/explain`)

**Purpose**: Explain protection plans in plain language

**Access**: All authenticated users

**Input**:
```json
{
  "task": "explain_coverage",
  "coverage_option": "...",
  "booking_context": { ... },
  "role": "renter|dealer"
}
```

**Output**:
```json
{
  "plain_language_explanation": "...",
  "included": [...],
  "excluded": [...],
  "next_steps": [...],
  "disclaimer": "..."
}
```

### 6. Policy Sentinel AI (`/api/ai/policy/check`)

**Purpose**: Check proposals against Carsera's non-negotiable rules

**Access**: Admins only

**Input**:
```json
{
  "task": "check_policy_compliance",
  "proposal_type": "...",
  "proposal_text": "...",
  "related_policy_rules": [...]
}
```

**Output**:
```json
{
  "status": "COMPLIANT|NON_COMPLIANT|NEEDS_REVIEW",
  "violations": [...],
  "risk_notes": "...",
  "safe_rewrite_suggestions": [...]
}
```

## Setup

### 1. Environment Variables

Add to `.env.local`:
```env
OPENAI_API_KEY=sk-...
```

### 2. Database Migration

Run the migration:
```bash
supabase db push
# Or apply supabase/migrations/029_add_ai_agents_system.sql
```

### 3. Verify Installation

Check that OpenAI package is installed:
```bash
npm list openai
```

## Usage Examples

### TrustGate AI Example

```typescript
const response = await fetch('/api/ai/trustgate/assess', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: 'assess_booking_risk',
    booking: {
      booking_id: 'BKG_123',
      start_date: '2026-01-10',
      end_date: '2026-01-12',
      pickup_city: 'Atlanta, GA',
      duration_days: 2,
      estimated_value_usd: 240,
    },
    vehicle: {
      vehicle_id: 'VH_991',
      tier: 'TIER_2',
      year: 2022,
      replacement_cost_usd: 24000,
    },
    renter: {
      renter_id: 'R_456',
      identity_verification: 'VERIFIED',
      license_status: 'VALID',
      prior_bookings_count: 1,
      prior_incidents_count: 0,
    },
    history: {
      chargeback_flags: 0,
      late_return_flags: 0,
      cancellations_last_90d: 0,
    },
    reviews_summary: {
      dealer_to_renter: { count: 1, negative_count: 0, themes: [] },
      renter_to_dealer: { count: 1, negative_count: 0, themes: [] },
    },
  }),
})

const result = await response.json()
// { decision: "ADVISORY_ONLY", risk_tier: "MEDIUM", ... }
```

## Security & Compliance

### Non-Negotiables

- ✅ AI never approves/denies bookings
- ✅ AI never executes payouts
- ✅ AI never makes insurance determinations
- ✅ AI never judges disputes (only structures evidence)
- ✅ All AI calls are logged for audit
- ✅ All AI outputs are advisory-only

### RLS Policies

- Dealers can only view AI runs for their own bookings
- Renters can only view AI runs for their own bookings
- Admins can view all AI runs
- Review signals are admin-only (except for own entity)

## Cost Management

- Uses `gpt-4o-mini` for cost-effectiveness
- Temperature set to 0.3 for consistent outputs
- Max tokens: 2000 per call
- All calls logged for cost tracking

## Error Handling

All routes:
- Validate input with Zod schemas
- Return 400 for invalid input
- Return 401 for unauthorized
- Return 403 for forbidden
- Return 500 for AI call failures
- Log all failures to `ai_runs` table

## Monitoring

Query AI usage:
```sql
SELECT 
  agent_name,
  COUNT(*) as call_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  AVG((output_json->>'confidence')::numeric) as avg_confidence
FROM ai_runs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;
```

## Next Steps

1. Create UI components to display AI recommendations
2. Integrate TrustGate AI into booking flow
3. Add admin dashboard for review signals
4. Build dealer-facing explanation UI
5. Add cost monitoring dashboard
