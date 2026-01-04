-- Screening System: MVR + Soft Credit Screening
-- Adds tables for consent management, screening records, and adverse actions
-- Uses free-now approach with provider adapters (mock + scaffold for Checkr)

-- 1. Policy Acceptances Table (reusable for any policy type)
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  policy_key TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, policy_key, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_policy_acceptances_user_id ON policy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_policy_key ON policy_acceptances(policy_key);

-- 2. Screening Consents Table (specific to screening workflows)
CREATE TABLE IF NOT EXISTS screening_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('mvr', 'soft_credit')),
  policy_key TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, booking_id, consent_type, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_screening_consents_user_id ON screening_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_consents_booking_id ON screening_consents(booking_id);
CREATE INDEX IF NOT EXISTS idx_screening_consents_consent_type ON screening_consents(consent_type);

-- 3. Renter Screenings Table (stores screening results)
CREATE TABLE IF NOT EXISTS renter_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  screening_type TEXT NOT NULL CHECK (screening_type IN ('mvr', 'soft_credit')),
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'pending', 'complete', 'failed')),
  result TEXT CHECK (result IN ('pass', 'conditional', 'fail')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renter_screenings_renter_id ON renter_screenings(renter_id);
CREATE INDEX IF NOT EXISTS idx_renter_screenings_booking_id ON renter_screenings(booking_id);
CREATE INDEX IF NOT EXISTS idx_renter_screenings_status ON renter_screenings(status);
CREATE INDEX IF NOT EXISTS idx_renter_screenings_screening_type ON renter_screenings(screening_type);

-- 4. Adverse Actions Table (scaffold for compliance)
CREATE TABLE IF NOT EXISTS adverse_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider TEXT NOT NULL,
  notice_status TEXT NOT NULL DEFAULT 'draft' CHECK (notice_status IN ('draft', 'sent')),
  notice_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adverse_actions_renter_id ON adverse_actions(renter_id);
CREATE INDEX IF NOT EXISTS idx_adverse_actions_booking_id ON adverse_actions(booking_id);
CREATE INDEX IF NOT EXISTS idx_adverse_actions_notice_status ON adverse_actions(notice_status);

-- Enable RLS
ALTER TABLE policy_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE renter_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE adverse_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for policy_acceptances
CREATE POLICY "Users can view their own policy acceptances"
  ON policy_acceptances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = policy_acceptances.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own policy acceptances"
  ON policy_acceptances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = policy_acceptances.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin roles can view all policy acceptances"
  ON policy_acceptances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for screening_consents
CREATE POLICY "Users can view their own screening consents"
  ON screening_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = screening_consents.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own screening consents"
  ON screening_consents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = screening_consents.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin roles can view all screening consents"
  ON screening_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for renter_screenings
-- Renters can view their own screening summaries
CREATE POLICY "Renters can view their own screening summaries"
  ON renter_screenings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = renter_screenings.renter_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Dealers can view screening summaries for renters when there's a booking request
CREATE POLICY "Dealers can view screening summaries for their booking requests"
  ON renter_screenings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles ON profiles.id = vehicles.dealer_id
      WHERE bookings.id = renter_screenings.booking_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Admin roles can view all screenings
CREATE POLICY "Admin roles can view all screenings"
  ON renter_screenings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Only server/service role can insert/update screenings (enforced at API level)
CREATE POLICY "No client access to insert screenings"
  ON renter_screenings FOR INSERT
  USING (false);

CREATE POLICY "No client access to update screenings"
  ON renter_screenings FOR UPDATE
  USING (false);

-- RLS Policies for adverse_actions
CREATE POLICY "Renters can view their own adverse actions"
  ON adverse_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = adverse_actions.renter_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin roles can view all adverse actions"
  ON adverse_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Only server/service role can insert/update adverse actions
CREATE POLICY "No client access to insert adverse actions"
  ON adverse_actions FOR INSERT
  USING (false);

CREATE POLICY "No client access to update adverse actions"
  ON adverse_actions FOR UPDATE
  USING (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_renter_screenings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_renter_screenings_updated_at
  BEFORE UPDATE ON renter_screenings
  FOR EACH ROW
  EXECUTE FUNCTION update_renter_screenings_updated_at();
