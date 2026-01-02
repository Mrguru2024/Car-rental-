-- Insurance & Liability System Migration
-- Protection Plans, BYOI Documents, Elections, Liability Acceptances, Claims

-- 1. Protection Plans Table
CREATE TABLE IF NOT EXISTS protection_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (name IN ('basic', 'standard', 'premium')),
  display_name TEXT NOT NULL,
  description TEXT,
  daily_fee_cents INTEGER NOT NULL CHECK (daily_fee_cents >= 0),
  deductible_cents INTEGER NOT NULL CHECK (deductible_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protection_plans_name ON protection_plans(name);
CREATE INDEX IF NOT EXISTS idx_protection_plans_is_active ON protection_plans(is_active);

-- Seed default protection plans
INSERT INTO protection_plans (name, display_name, description, daily_fee_cents, deductible_cents) VALUES
  ('basic', 'Basic Protection Plan', 'Essential coverage for your rental', 1500, 50000),
  ('standard', 'Standard Protection Plan', 'Comprehensive protection with moderate deductible', 2500, 30000),
  ('premium', 'Premium Protection Plan', 'Maximum coverage with low deductible', 4000, 15000)
ON CONFLICT DO NOTHING;

-- 2. BYOI Documents Table
CREATE TABLE IF NOT EXISTS byoi_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  policyholder_name TEXT NOT NULL,
  policy_number TEXT,
  insurer_name TEXT,
  coverage_notes TEXT,
  effective_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_byoi_documents_renter_profile_id ON byoi_documents(renter_profile_id);
CREATE INDEX IF NOT EXISTS idx_byoi_documents_status ON byoi_documents(status);
CREATE INDEX IF NOT EXISTS idx_byoi_documents_expiration_date ON byoi_documents(expiration_date);

-- 3. Booking Insurance Elections Table
CREATE TABLE IF NOT EXISTS booking_insurance_elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  coverage_type TEXT NOT NULL CHECK (coverage_type IN ('platform_plan', 'byoi')),
  protection_plan_id UUID REFERENCES protection_plans(id) ON DELETE SET NULL,
  plan_fee_cents INTEGER NOT NULL CHECK (plan_fee_cents >= 0) DEFAULT 0,
  deductible_cents INTEGER NOT NULL CHECK (deductible_cents >= 0) DEFAULT 0,
  coverage_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  byoi_document_id UUID REFERENCES byoi_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_insurance_elections_booking_id ON booking_insurance_elections(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_insurance_elections_coverage_type ON booking_insurance_elections(coverage_type);
CREATE INDEX IF NOT EXISTS idx_booking_insurance_elections_byoi_document_id ON booking_insurance_elections(byoi_document_id);

-- 4. Liability Acceptances Table
CREATE TABLE IF NOT EXISTS liability_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  acceptance_text_version TEXT NOT NULL,
  acceptance_text TEXT NOT NULL,
  typed_full_name TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_liability_acceptances_booking_id ON liability_acceptances(booking_id);
CREATE INDEX IF NOT EXISTS idx_liability_acceptances_user_id ON liability_acceptances(user_id);

-- 5. Claims Table
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  renter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coverage_type TEXT NOT NULL CHECK (coverage_type IN ('platform_plan', 'byoi')),
  incident_datetime TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  police_report_file_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'in_review', 'closed')) DEFAULT 'submitted',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_booking_id ON claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_claims_renter_profile_id ON claims(renter_profile_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

-- 6. Claim Photos Table
CREATE TABLE IF NOT EXISTS claim_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_photos_claim_id ON claim_photos(claim_id);

-- 7. Update bookings table
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS plan_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (plan_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS coverage_type TEXT CHECK (coverage_type IN ('platform_plan', 'byoi'));

-- 8. Triggers for updated_at
CREATE TRIGGER update_byoi_documents_updated_at
  BEFORE UPDATE ON byoi_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE protection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE byoi_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_insurance_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE liability_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_photos ENABLE ROW LEVEL SECURITY;