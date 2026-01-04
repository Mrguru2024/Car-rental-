-- Disputes System
-- Adds tables for renter-facing dispute resolution
-- Separate from claims system (claims = insurance/accidents, disputes = booking issues)

-- 1. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opened_by_role TEXT NOT NULL CHECK (opened_by_role IN ('renter', 'dealer', 'private_host')),
  category TEXT NOT NULL CHECK (category IN ('vehicle_damage', 'late_return', 'cleaning_fee', 'mechanical_issue', 'safety_concern', 'billing_issue', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'awaiting_response', 'under_review', 'resolved', 'escalated', 'closed')),
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);
CREATE INDEX IF NOT EXISTS idx_disputes_category ON disputes(category);

-- 2. Dispute Messages Table
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('renter', 'dealer', 'private_host', 'admin', 'prime_admin', 'super_admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_id ON dispute_messages(sender_id);

-- 3. Dispute Evidence Table
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  uploaded_by_role TEXT NOT NULL CHECK (uploaded_by_role IN ('renter', 'dealer', 'private_host', 'admin', 'prime_admin', 'super_admin')),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploaded_by ON dispute_evidence(uploaded_by);

-- 4. Dispute Decisions Table (immutable decision history)
CREATE TABLE IF NOT EXISTS dispute_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  decided_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  decided_by_role TEXT NOT NULL CHECK (decided_by_role IN ('admin', 'prime_admin', 'super_admin')),
  decision TEXT NOT NULL CHECK (decision IN ('no_action', 'partial_refund', 'full_refund', 'fee_waived', 'escalate_to_coverage', 'close', 'reverse', 'flag', 'lock')),
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_decisions_dispute_id ON dispute_decisions(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_decisions_decided_by ON dispute_decisions(decided_by);

-- Enable RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes
-- Renters can create disputes for their own bookings
CREATE POLICY "Renters can create disputes for their own bookings"
  ON disputes FOR INSERT
  WITH CHECK (
    opened_by_role = 'renter' AND
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN profiles ON profiles.id = bookings.renter_id
      WHERE bookings.id = disputes.booking_id
      AND profiles.id = disputes.opened_by
      AND profiles.user_id = auth.uid()
    )
  );

-- Renters can view disputes for their own bookings
CREATE POLICY "Renters can view disputes for their own bookings"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN profiles ON profiles.id = bookings.renter_id
      WHERE bookings.id = disputes.booking_id
      AND profiles.id = disputes.opened_by
      AND profiles.user_id = auth.uid()
    )
  );

-- Dealers can view disputes for bookings on their vehicles
CREATE POLICY "Dealers can view disputes for their vehicle bookings"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles ON profiles.id = vehicles.dealer_id
      WHERE bookings.id = disputes.booking_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Admin roles can view all disputes
CREATE POLICY "Admin roles can view all disputes"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Only admins can update dispute status
CREATE POLICY "Admin roles can update dispute status"
  ON disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- RLS Policies for dispute_messages
-- Parties (renter/dealer) can view messages for disputes they're party to
CREATE POLICY "Parties can view messages for their disputes"
  ON dispute_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      INNER JOIN bookings ON bookings.id = disputes.booking_id
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles AS renter_profile ON renter_profile.id = bookings.renter_id
      INNER JOIN profiles AS dealer_profile ON dealer_profile.id = vehicles.dealer_id
      WHERE disputes.id = dispute_messages.dispute_id
      AND (
        (renter_profile.user_id = auth.uid() AND disputes.opened_by_role = 'renter') OR
        (dealer_profile.user_id = auth.uid() AND (dealer_profile.role = 'dealer' OR dealer_profile.role = 'private_host'))
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Parties can add messages (when status not closed)
CREATE POLICY "Parties can add messages to open disputes"
  ON dispute_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes
      INNER JOIN bookings ON bookings.id = disputes.booking_id
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles AS renter_profile ON renter_profile.id = bookings.renter_id
      INNER JOIN profiles AS dealer_profile ON dealer_profile.id = vehicles.dealer_id
      WHERE disputes.id = dispute_messages.dispute_id
      AND disputes.status != 'closed'
      AND (
        (renter_profile.user_id = auth.uid() AND dispute_messages.sender_id = renter_profile.id) OR
        (dealer_profile.user_id = auth.uid() AND dispute_messages.sender_id = dealer_profile.id)
      )
    )
  );

-- Admin roles can add messages
CREATE POLICY "Admin roles can add messages"
  ON dispute_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
      AND profiles.id = dispute_messages.sender_id
    )
  );

-- RLS Policies for dispute_evidence
-- Parties can view evidence for disputes they're party to
CREATE POLICY "Parties can view evidence for their disputes"
  ON dispute_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      INNER JOIN bookings ON bookings.id = disputes.booking_id
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles AS renter_profile ON renter_profile.id = bookings.renter_id
      INNER JOIN profiles AS dealer_profile ON dealer_profile.id = vehicles.dealer_id
      WHERE disputes.id = dispute_evidence.dispute_id
      AND (
        (renter_profile.user_id = auth.uid() AND disputes.opened_by_role = 'renter') OR
        (dealer_profile.user_id = auth.uid() AND (dealer_profile.role = 'dealer' OR dealer_profile.role = 'private_host'))
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Parties can upload evidence for disputes they're party to
CREATE POLICY "Parties can upload evidence for their disputes"
  ON dispute_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes
      INNER JOIN bookings ON bookings.id = disputes.booking_id
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles AS renter_profile ON renter_profile.id = bookings.renter_id
      INNER JOIN profiles AS dealer_profile ON dealer_profile.id = vehicles.dealer_id
      WHERE disputes.id = dispute_evidence.dispute_id
      AND disputes.status != 'closed'
      AND (
        (renter_profile.user_id = auth.uid() AND dispute_evidence.uploaded_by = renter_profile.id) OR
        (dealer_profile.user_id = auth.uid() AND dispute_evidence.uploaded_by = dealer_profile.id)
      )
    )
  );

-- Admin roles can upload evidence
CREATE POLICY "Admin roles can upload evidence"
  ON dispute_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
      AND profiles.id = dispute_evidence.uploaded_by
    )
  );

-- RLS Policies for dispute_decisions
-- Parties and admins can view decisions
CREATE POLICY "Parties and admins can view decisions"
  ON dispute_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      INNER JOIN bookings ON bookings.id = disputes.booking_id
      INNER JOIN vehicles ON vehicles.id = bookings.vehicle_id
      INNER JOIN profiles AS renter_profile ON renter_profile.id = bookings.renter_id
      INNER JOIN profiles AS dealer_profile ON dealer_profile.id = vehicles.dealer_id
      WHERE disputes.id = dispute_decisions.dispute_id
      AND (
        (renter_profile.user_id = auth.uid()) OR
        (dealer_profile.user_id = auth.uid() AND (dealer_profile.role = 'dealer' OR dealer_profile.role = 'private_host'))
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Only admin roles can create decisions (enforced at API level, but RLS helps)
CREATE POLICY "Admin roles can create decisions"
  ON dispute_decisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
      AND profiles.id = dispute_decisions.decided_by
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_disputes_updated_at();

-- Note: Storage bucket 'dispute-evidence' must be created manually in Supabase dashboard
-- See documentation for storage bucket setup instructions
