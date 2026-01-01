-- Risk Mitigation & Trust Automation Layer
-- DO NOT modify existing tables, only add new ones

-- 1. Extend profiles.role to support private_host (if using enum, add value; if text, no change needed)
-- Note: If role is text type, this is already supported. If enum, uncomment below:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'private_host';

-- 2. Automated verification states table
CREATE TABLE IF NOT EXISTS verification_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('renter', 'dealer', 'private_host')),
  status TEXT NOT NULL CHECK (status IN ('verified', 'restricted', 'rejected', 'pending')),
  reasons JSONB DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_verification_states_user_id ON verification_states(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_states_status ON verification_states(status);

-- 3. Insurance records table
CREATE TABLE IF NOT EXISTS insurance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  policy_number TEXT,
  expires_on DATE,
  status TEXT NOT NULL CHECK (status IN ('valid', 'expired', 'missing')) DEFAULT 'missing',
  document_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_records_user_id ON insurance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_records_status ON insurance_records(status);
CREATE INDEX IF NOT EXISTS idx_insurance_records_expires_on ON insurance_records(expires_on);

-- 4. Vehicle image map for fallback images
CREATE TABLE IF NOT EXISTS vehicle_image_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_key_hash TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('vinaudit', 'host_upload', 'fallback')),
  image_urls JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_image_map_key_hash ON vehicle_image_map(vehicle_key_hash);

-- 5. Rate limiting table for fraud prevention
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- user_id or IP address
  action_type TEXT NOT NULL, -- 'booking_attempt', 'verification_submit', etc.
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, action_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Enable RLS on new tables
ALTER TABLE verification_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_image_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_states
CREATE POLICY "Users can view their own verification state"
  ON verification_states FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = verification_states.user_id));

-- RLS Policies for insurance_records
CREATE POLICY "Users can view their own insurance records"
  ON insurance_records FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = insurance_records.user_id));

CREATE POLICY "Users can insert their own insurance records"
  ON insurance_records FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = insurance_records.user_id));

CREATE POLICY "Users can update their own insurance records"
  ON insurance_records FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = insurance_records.user_id));

-- vehicle_image_map is public read (for display)
CREATE POLICY "Anyone can read vehicle image map"
  ON vehicle_image_map FOR SELECT
  USING (true);

-- rate_limits is server-side only (no direct client access needed)
CREATE POLICY "No client access to rate_limits"
  ON rate_limits FOR ALL
  USING (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_verification_states_updated_at
  BEFORE UPDATE ON verification_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_records_updated_at
  BEFORE UPDATE ON insurance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_image_map_updated_at
  BEFORE UPDATE ON vehicle_image_map
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
