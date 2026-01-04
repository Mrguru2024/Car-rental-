-- Dealer Complaints & Renter Reviews System
-- Adds dealer complaint process, dealer→renter reviews, and extends policy acceptances with context

-- 1. Extend policy_acceptances table with context fields (if not already present)
-- First, create the table if it doesn't exist (from migration 021)
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  policy_key TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes if they don't exist (from migration 021)
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_user_id ON policy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_policy_key ON policy_acceptances(policy_key);

-- Enable RLS if not already enabled (from migration 021)
ALTER TABLE policy_acceptances ENABLE ROW LEVEL SECURITY;

-- Add new columns if they don't exist
ALTER TABLE policy_acceptances
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS context_type TEXT,
  ADD COLUMN IF NOT EXISTS context_id UUID;

-- Update unique constraint to include context (drop old, create new)
-- Note: Migration 021 creates table with inline UNIQUE(user_id, policy_key, policy_version)
-- which PostgreSQL auto-names. We find and drop it, then create the new 5-column constraint.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find unique constraint with exactly 3 columns (the old one from migration 021)
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'policy_acceptances'::regclass
  AND c.contype = 'u'
  AND array_length(c.conkey, 1) = 3
  AND c.conname != 'policy_acceptances_user_id_policy_key_policy_version_context_key'
  LIMIT 1;
  
  -- Drop the old constraint if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE policy_acceptances DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
  
  -- Create new constraint with context (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'policy_acceptances'::regclass
    AND conname = 'policy_acceptances_user_id_policy_key_policy_version_context_key'
  ) THEN
    ALTER TABLE policy_acceptances 
    ADD CONSTRAINT policy_acceptances_user_id_policy_key_policy_version_context_key
    UNIQUE(user_id, policy_key, policy_version, context_type, context_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_policy_acceptances_context ON policy_acceptances(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_role ON policy_acceptances(role);

-- 2. Dealer Complaints Table
CREATE TABLE IF NOT EXISTS dealer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('late_return', 'cleaning_fee', 'damage', 'unauthorized_driver', 'fraud', 'threatening_behavior', 'other')),
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'resolved', 'escalated', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dealer_complaints_booking_id ON dealer_complaints(booking_id);
CREATE INDEX IF NOT EXISTS idx_dealer_complaints_renter_id ON dealer_complaints(renter_id);
CREATE INDEX IF NOT EXISTS idx_dealer_complaints_dealer_id ON dealer_complaints(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_complaints_status ON dealer_complaints(status);

-- 3. Complaint Messages Table
CREATE TABLE IF NOT EXISTS complaint_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES dealer_complaints(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('dealer', 'private_host', 'renter', 'admin', 'prime_admin', 'super_admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint_id ON complaint_messages(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_sender_id ON complaint_messages(sender_id);

-- 4. Complaint Evidence Table
CREATE TABLE IF NOT EXISTS complaint_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES dealer_complaints(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  uploaded_by_role TEXT NOT NULL CHECK (uploaded_by_role IN ('dealer', 'private_host', 'renter', 'admin', 'prime_admin', 'super_admin')),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_evidence_complaint_id ON complaint_evidence(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_evidence_uploaded_by ON complaint_evidence(uploaded_by);

-- 5. Renter Reviews Table (Dealer→Renter reviews, visible to dealers)
CREATE TABLE IF NOT EXISTS renter_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  dealer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renter_reviews_renter_id ON renter_reviews(renter_id);
CREATE INDEX IF NOT EXISTS idx_renter_reviews_dealer_id ON renter_reviews(dealer_id);
CREATE INDEX IF NOT EXISTS idx_renter_reviews_booking_id ON renter_reviews(booking_id);

-- Enable RLS
ALTER TABLE dealer_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE renter_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dealer_complaints
-- Dealers can create/view complaints for their bookings
CREATE POLICY "Dealers can create complaints for their bookings"
  ON dealer_complaints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles ON profiles.id = vehicles.dealer_id
      WHERE bookings.id = dealer_complaints.booking_id
      AND profiles.id = dealer_complaints.dealer_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

CREATE POLICY "Dealers can view their complaints"
  ON dealer_complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = dealer_complaints.dealer_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Renters can view complaints about them
CREATE POLICY "Renters can view complaints about them"
  ON dealer_complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = dealer_complaints.renter_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Admin roles can view all complaints
CREATE POLICY "Admin roles can view all complaints"
  ON dealer_complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Only dealers can update complaint status (draft→submitted)
CREATE POLICY "Dealers can update their own complaint status"
  ON dealer_complaints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = dealer_complaints.dealer_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Admin roles can update complaint status
CREATE POLICY "Admin roles can update complaint status"
  ON dealer_complaints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for complaint_messages
-- Dealers can view/add messages for their complaints
CREATE POLICY "Dealers can view messages for their complaints"
  ON complaint_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_complaints
      INNER JOIN profiles ON profiles.id = dealer_complaints.dealer_id
      WHERE dealer_complaints.id = complaint_messages.complaint_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Renters can view/add messages for complaints about them
CREATE POLICY "Renters can view messages for complaints about them"
  ON complaint_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_complaints
      INNER JOIN profiles ON profiles.id = dealer_complaints.renter_id
      WHERE dealer_complaints.id = complaint_messages.complaint_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Parties can add messages to complaints"
  ON complaint_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_complaints
      INNER JOIN profiles AS dealer_profile ON dealer_profile.id = dealer_complaints.dealer_id
      INNER JOIN profiles AS renter_profile ON renter_profile.id = dealer_complaints.renter_id
      WHERE dealer_complaints.id = complaint_messages.complaint_id
      AND (
        (dealer_profile.user_id = auth.uid() AND complaint_messages.sender_id = dealer_profile.id) OR
        (renter_profile.user_id = auth.uid() AND complaint_messages.sender_id = renter_profile.id)
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
      AND profiles.id = complaint_messages.sender_id
    )
  );

-- Admin roles can view all messages
CREATE POLICY "Admin roles can view all complaint messages"
  ON complaint_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for complaint_evidence
-- Dealers can view/upload evidence for their complaints
CREATE POLICY "Dealers can view evidence for their complaints"
  ON complaint_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_complaints
      INNER JOIN profiles ON profiles.id = dealer_complaints.dealer_id
      WHERE dealer_complaints.id = complaint_evidence.complaint_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Renters can view evidence for complaints about them
CREATE POLICY "Renters can view evidence for complaints about them"
  ON complaint_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_complaints
      INNER JOIN profiles ON profiles.id = dealer_complaints.renter_id
      WHERE dealer_complaints.id = complaint_evidence.complaint_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Parties can upload evidence to complaints"
  ON complaint_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_complaints
      INNER JOIN profiles AS dealer_profile ON dealer_profile.id = dealer_complaints.dealer_id
      INNER JOIN profiles AS renter_profile ON renter_profile.id = dealer_complaints.renter_id
      WHERE dealer_complaints.id = complaint_evidence.complaint_id
      AND (
        (dealer_profile.user_id = auth.uid() AND complaint_evidence.uploaded_by = dealer_profile.id) OR
        (renter_profile.user_id = auth.uid() AND complaint_evidence.uploaded_by = renter_profile.id)
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
      AND profiles.id = complaint_evidence.uploaded_by
    )
  );

-- Admin roles can view all evidence
CREATE POLICY "Admin roles can view all complaint evidence"
  ON complaint_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for renter_reviews
-- Dealers can create/view reviews
CREATE POLICY "Dealers can create reviews for their bookings"
  ON renter_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles ON profiles.id = vehicles.dealer_id
      WHERE bookings.id = renter_reviews.booking_id
      AND profiles.id = renter_reviews.dealer_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Dealers can view all renter reviews (for trust profiles)
CREATE POLICY "Dealers can view all renter reviews"
  ON renter_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host' OR profiles.role IN ('admin', 'prime_admin', 'super_admin'))
    )
  );

-- Renters can view their own reviews
CREATE POLICY "Renters can view their own reviews"
  ON renter_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = renter_reviews.renter_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dealer_complaints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dealer_complaints_updated_at
  BEFORE UPDATE ON dealer_complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_dealer_complaints_updated_at();

-- Note: Storage bucket 'complaint-evidence' must be created manually in Supabase dashboard
-- See documentation for storage bucket setup instructions
