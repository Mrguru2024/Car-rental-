-- AI Agents System
-- Tables for storing AI agent runs, recommendations, and signals
-- All AI outputs are advisory-only and logged for auditability

-- 1. AI Runs Table (audit log for all AI agent calls)
CREATE TABLE IF NOT EXISTS ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL CHECK (agent_name IN (
    'trustgate_ai',
    'feedback_intelligence_ai',
    'dealerops_ai',
    'evidencepack_ai',
    'coverage_clarity_ai',
    'policy_sentinel_ai'
  )),
  input_json JSONB NOT NULL,
  output_json JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  renter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_agent_name ON ai_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_runs_booking_id ON ai_runs(booking_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_dealer_id ON ai_runs(dealer_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_renter_id ON ai_runs(renter_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_created_at ON ai_runs(created_at DESC);

-- 2. TrustGate Recommendations Table
CREATE TABLE IF NOT EXISTS trustgate_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('LOW', 'MEDIUM', 'ELEVATED', 'NEEDS_MANUAL_REVIEW')),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  why TEXT,
  missing_data JSONB DEFAULT '[]'::jsonb,
  ai_run_id UUID NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
  final_decision_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  final_decision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trustgate_recommendations_booking_id ON trustgate_recommendations(booking_id);
CREATE INDEX IF NOT EXISTS idx_trustgate_recommendations_risk_tier ON trustgate_recommendations(risk_tier);
CREATE INDEX IF NOT EXISTS idx_trustgate_recommendations_ai_run_id ON trustgate_recommendations(ai_run_id);

-- 3. Review Signals Table
CREATE TABLE IF NOT EXISTS review_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('RENTER', 'DEALER', 'PLATFORM')),
  entity_id UUID NOT NULL,
  pattern_level TEXT NOT NULL CHECK (pattern_level IN ('NONE', 'WEAK', 'MODERATE', 'STRONG')),
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  retaliation_risk TEXT CHECK (retaliation_risk IN ('LOW', 'MEDIUM', 'HIGH')),
  recommended_ops_action TEXT NOT NULL CHECK (recommended_ops_action IN (
    'NO_ACTION',
    'WATCHLIST',
    'MANUAL_REVIEW',
    'REQUEST_MORE_INFO'
  )),
  notes TEXT,
  ai_run_id UUID NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_signals_entity ON review_signals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_review_signals_pattern_level ON review_signals(pattern_level);
CREATE INDEX IF NOT EXISTS idx_review_signals_ai_run_id ON review_signals(ai_run_id);

-- Enable RLS
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustgate_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_runs
-- Dealers can view their own AI runs
CREATE POLICY "Dealers can view their own AI runs"
  ON ai_runs
  FOR SELECT
  USING (
    dealer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    booking_id IN (
      SELECT id FROM bookings
      WHERE vehicle_id IN (
        SELECT id FROM vehicles
        WHERE dealer_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Renters can view their own AI runs
CREATE POLICY "Renters can view their own AI runs"
  ON ai_runs
  FOR SELECT
  USING (
    renter_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    booking_id IN (
      SELECT id FROM bookings
      WHERE renter_id = auth.uid()
    )
  );

-- Admins can view all AI runs
CREATE POLICY "Admins can view all AI runs"
  ON ai_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Only service role can insert AI runs (via API routes)
CREATE POLICY "Service role can insert AI runs"
  ON ai_runs
  FOR INSERT
  WITH CHECK (false);

-- RLS Policies for trustgate_recommendations
-- Dealers can view recommendations for their bookings
CREATE POLICY "Dealers can view their booking recommendations"
  ON trustgate_recommendations
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE vehicle_id IN (
        SELECT id FROM vehicles
        WHERE dealer_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Renters can view recommendations for their bookings
CREATE POLICY "Renters can view their booking recommendations"
  ON trustgate_recommendations
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE renter_id = auth.uid()
    )
  );

-- Admins can view all recommendations
CREATE POLICY "Admins can view all recommendations"
  ON trustgate_recommendations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Admins can update final_decision
CREATE POLICY "Admins can update final decision"
  ON trustgate_recommendations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for review_signals
-- Admins can view all review signals
CREATE POLICY "Admins can view all review signals"
  ON review_signals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Dealers can view signals for their own entity
CREATE POLICY "Dealers can view their own signals"
  ON review_signals
  FOR SELECT
  USING (
    entity_type = 'DEALER'
    AND entity_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Renters can view signals for their own entity
CREATE POLICY "Renters can view their own signals"
  ON review_signals
  FOR SELECT
  USING (
    entity_type = 'RENTER'
    AND entity_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE ai_runs IS 'Audit log for all AI agent runs. All AI outputs are advisory-only.';
COMMENT ON TABLE trustgate_recommendations IS 'TrustGate AI risk assessments and recommended conditions for bookings. Advisory-only.';
COMMENT ON TABLE review_signals IS 'Feedback Intelligence AI pattern detection from reviews. Used for operational signals, not public ratings.';
