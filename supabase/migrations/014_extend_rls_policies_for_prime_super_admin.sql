-- Extend RLS policies to include prime_admin and super_admin roles
-- Updates existing admin-only policies to allow all admin roles
-- Also creates tables if they don't exist (in case migration 006 wasn't run)

-- 1. Create Protection Plans table if it doesn't exist
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

-- Seed default protection plans if they don't exist
INSERT INTO protection_plans (name, display_name, description, daily_fee_cents, deductible_cents) VALUES
  ('basic', 'Basic Protection Plan', 'Essential coverage for your rental', 1500, 50000),
  ('standard', 'Standard Protection Plan', 'Comprehensive protection with moderate deductible', 2500, 30000),
  ('premium', 'Premium Protection Plan', 'Maximum coverage with low deductible', 4000, 15000)
ON CONFLICT DO NOTHING;

ALTER TABLE protection_plans ENABLE ROW LEVEL SECURITY;

-- Create public read policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'protection_plans' 
    AND policyname = 'Anyone can view active protection plans'
  ) THEN
    CREATE POLICY "Anyone can view active protection plans"
      ON protection_plans FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- 1. Protection Plans Policies
DROP POLICY IF EXISTS "Admins can manage all protection plans" ON protection_plans;

CREATE POLICY "Admin roles can manage all protection plans"
  ON protection_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- 2. Create BYOI Documents table if it doesn't exist
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

ALTER TABLE byoi_documents ENABLE ROW LEVEL SECURITY;

-- Create renter policies for BYOI documents if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'byoi_documents' 
    AND policyname = 'Renters can create their own BYOI documents'
  ) THEN
    CREATE POLICY "Renters can create their own BYOI documents"
      ON byoi_documents FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = byoi_documents.renter_profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'byoi_documents' 
    AND policyname = 'Renters can view their own BYOI documents'
  ) THEN
    CREATE POLICY "Renters can view their own BYOI documents"
      ON byoi_documents FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = byoi_documents.renter_profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'byoi_documents' 
    AND policyname = 'Renters can update their own BYOI documents'
  ) THEN
    CREATE POLICY "Renters can update their own BYOI documents"
      ON byoi_documents FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = byoi_documents.renter_profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
END $$;

-- 2. BYOI Documents Policies
DROP POLICY IF EXISTS "Admins can view all BYOI documents" ON byoi_documents;
DROP POLICY IF EXISTS "Admins can update all BYOI documents" ON byoi_documents;

CREATE POLICY "Admin roles can view all BYOI documents"
  ON byoi_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

CREATE POLICY "Admin roles can update all BYOI documents"
  ON byoi_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- 3. Create Booking Insurance Elections table if it doesn't exist
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

ALTER TABLE booking_insurance_elections ENABLE ROW LEVEL SECURITY;

-- Create renter policies for booking insurance elections if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'booking_insurance_elections' 
    AND policyname = 'Renters can create insurance elections for their own bookings'
  ) THEN
    CREATE POLICY "Renters can create insurance elections for their own bookings"
      ON booking_insurance_elections FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM bookings
          INNER JOIN profiles ON profiles.user_id = bookings.renter_id
          WHERE bookings.id = booking_insurance_elections.booking_id
          AND profiles.user_id = auth.uid()
          AND bookings.status IN ('draft', 'pending_payment')
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'booking_insurance_elections' 
    AND policyname = 'Renters can update insurance elections for their own bookings'
  ) THEN
    CREATE POLICY "Renters can update insurance elections for their own bookings"
      ON booking_insurance_elections FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM bookings
          INNER JOIN profiles ON profiles.user_id = bookings.renter_id
          WHERE bookings.id = booking_insurance_elections.booking_id
          AND profiles.user_id = auth.uid()
          AND bookings.status IN ('draft', 'pending_payment')
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'booking_insurance_elections' 
    AND policyname = 'Renters can view insurance elections for their own bookings'
  ) THEN
    CREATE POLICY "Renters can view insurance elections for their own bookings"
      ON booking_insurance_elections FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM bookings
          INNER JOIN profiles ON profiles.user_id = bookings.renter_id
          WHERE bookings.id = booking_insurance_elections.booking_id
          AND profiles.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3. Booking Insurance Elections Policies
DROP POLICY IF EXISTS "Admins can view all insurance elections" ON booking_insurance_elections;

CREATE POLICY "Admin roles can view all insurance elections"
  ON booking_insurance_elections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- 4. Create Liability Acceptances table if it doesn't exist
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

ALTER TABLE liability_acceptances ENABLE ROW LEVEL SECURITY;

-- Create renter policies for liability acceptances if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'liability_acceptances' 
    AND policyname = 'Renters can create liability acceptances for their own bookings'
  ) THEN
    CREATE POLICY "Renters can create liability acceptances for their own bookings"
      ON liability_acceptances FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = liability_acceptances.user_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'liability_acceptances' 
    AND policyname = 'Renters can view their own liability acceptances'
  ) THEN
    CREATE POLICY "Renters can view their own liability acceptances"
      ON liability_acceptances FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = liability_acceptances.user_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
END $$;

-- 4. Liability Acceptances Policies
DROP POLICY IF EXISTS "Admins can view all liability acceptances" ON liability_acceptances;

CREATE POLICY "Admin roles can view all liability acceptances"
  ON liability_acceptances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- 5. Create Claims table if it doesn't exist
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

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Create renter policies for claims if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claims' 
    AND policyname = 'Renters can create claims for their own bookings'
  ) THEN
    CREATE POLICY "Renters can create claims for their own bookings"
      ON claims FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = claims.renter_profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claims' 
    AND policyname = 'Renters can view their own claims'
  ) THEN
    CREATE POLICY "Renters can view their own claims"
      ON claims FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = claims.renter_profile_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
END $$;

-- 5. Claims Policies
DROP POLICY IF EXISTS "Admins can view all claims" ON claims;
DROP POLICY IF EXISTS "Admins can update all claims" ON claims;

CREATE POLICY "Admin roles can view all claims"
  ON claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

CREATE POLICY "Admin roles can update all claims"
  ON claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- 6. Create Claim Photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS claim_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_photos_claim_id ON claim_photos(claim_id);

ALTER TABLE claim_photos ENABLE ROW LEVEL SECURITY;

-- 6. Create Claim Photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS claim_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_photos_claim_id ON claim_photos(claim_id);

ALTER TABLE claim_photos ENABLE ROW LEVEL SECURITY;

-- Create renter policies for claim photos if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claim_photos' 
    AND policyname = 'Renters can create photos for their own claims'
  ) THEN
    CREATE POLICY "Renters can create photos for their own claims"
      ON claim_photos FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM claims
          INNER JOIN profiles ON profiles.id = claims.renter_profile_id
          WHERE claims.id = claim_photos.claim_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claim_photos' 
    AND policyname = 'Renters can view photos for their own claims'
  ) THEN
    CREATE POLICY "Renters can view photos for their own claims"
      ON claim_photos FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM claims
          INNER JOIN profiles ON profiles.id = claims.renter_profile_id
          WHERE claims.id = claim_photos.claim_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claim_photos' 
    AND policyname = 'Renters can update photos for their own claims'
  ) THEN
    CREATE POLICY "Renters can update photos for their own claims"
      ON claim_photos FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM claims
          INNER JOIN profiles ON profiles.id = claims.renter_profile_id
          WHERE claims.id = claim_photos.claim_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claim_photos' 
    AND policyname = 'Renters can delete photos for their own claims'
  ) THEN
    CREATE POLICY "Renters can delete photos for their own claims"
      ON claim_photos FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM claims
          INNER JOIN profiles ON profiles.id = claims.renter_profile_id
          WHERE claims.id = claim_photos.claim_id
          AND profiles.user_id = auth.uid()
          AND profiles.role = 'renter'
        )
      );
  END IF;
END $$;

-- 6. Claim Photos Policies
DROP POLICY IF EXISTS "Admins can view all claim photos" ON claim_photos;

CREATE POLICY "Admin roles can view all claim photos"
  ON claim_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );
