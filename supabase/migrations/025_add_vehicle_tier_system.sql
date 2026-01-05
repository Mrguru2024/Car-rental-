-- Vehicle Tier System
-- Adds tier, title type, inspection status to vehicles
-- Adds dealer rental policies table
-- DO NOT modify existing columns, only add new ones

-- 1. Add vehicle tier and related fields to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS vehicle_tier TEXT NOT NULL DEFAULT 'tier2' CHECK (vehicle_tier IN ('tier1', 'tier2', 'tier3', 'tier4')),
ADD COLUMN IF NOT EXISTS title_type TEXT NOT NULL DEFAULT 'clean' CHECK (title_type IN ('clean', 'rebuilt', 'salvage', 'flood', 'other')),
ADD COLUMN IF NOT EXISTS inspection_status TEXT NOT NULL DEFAULT 'pending' CHECK (inspection_status IN ('pending', 'passed', 'failed')),
ADD COLUMN IF NOT EXISTS inspection_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS inspection_notes TEXT;

-- Add constraint: Platform minimum year is 2010
-- Only add if constraint doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicles_year_minimum' 
    AND conrelid = 'vehicles'::regclass
  ) THEN
    ALTER TABLE vehicles
    ADD CONSTRAINT vehicles_year_minimum CHECK (year >= 2010);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Add constraint: Platform rule - no salvage/flood/rebuilt titles allowed
-- Only add if constraint doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicles_title_type_platform_rule' 
    AND conrelid = 'vehicles'::regclass
  ) THEN
    ALTER TABLE vehicles
    ADD CONSTRAINT vehicles_title_type_platform_rule CHECK (
      title_type NOT IN ('salvage', 'flood', 'rebuilt')
    );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Create index on vehicle_tier for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_tier ON vehicles(vehicle_tier);
CREATE INDEX IF NOT EXISTS idx_vehicles_title_type ON vehicles(title_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_inspection_status ON vehicles(inspection_status);

-- 2. Create dealer_rental_policies table
CREATE TABLE IF NOT EXISTS dealer_rental_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  min_vehicle_year INTEGER NOT NULL DEFAULT 2010,
  allowed_vehicle_tiers JSONB NOT NULL DEFAULT '["tier1","tier2","tier3","tier4"]'::jsonb,
  require_manual_approval BOOLEAN NOT NULL DEFAULT true,
  min_renter_standing_grade TEXT NOT NULL DEFAULT 'C' CHECK (min_renter_standing_grade IN ('A', 'B', 'C', 'D', 'F')),
  block_flagged_renters BOOLEAN NOT NULL DEFAULT true,
  require_mvr_for_tier3 BOOLEAN NOT NULL DEFAULT true,
  require_mvr_for_tier4 BOOLEAN NOT NULL DEFAULT true,
  require_soft_credit_for_tier3 BOOLEAN NOT NULL DEFAULT false,
  require_soft_credit_for_tier4 BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add constraint: Dealer cannot set min_vehicle_year below platform minimum (2010)
-- Only add if constraint doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dealer_policies_min_year_platform_rule' 
    AND conrelid = 'dealer_rental_policies'::regclass
  ) THEN
    ALTER TABLE dealer_rental_policies
    ADD CONSTRAINT dealer_policies_min_year_platform_rule CHECK (min_vehicle_year >= 2010);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_dealer_rental_policies_dealer_id ON dealer_rental_policies(dealer_id);

-- Enable RLS
ALTER TABLE dealer_rental_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dealer_rental_policies
-- Drop policies if they exist, then create (idempotent)
DROP POLICY IF EXISTS "Dealers can view their own policies" ON dealer_rental_policies;
DROP POLICY IF EXISTS "Dealers can update their own policies" ON dealer_rental_policies;
DROP POLICY IF EXISTS "Dealers can insert their own policies" ON dealer_rental_policies;
DROP POLICY IF EXISTS "Admins can view all policies" ON dealer_rental_policies;
DROP POLICY IF EXISTS "Admins can update all policies" ON dealer_rental_policies;

-- Dealers can view/update their own policies
CREATE POLICY "Dealers can view their own policies"
  ON dealer_rental_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = dealer_rental_policies.dealer_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

CREATE POLICY "Dealers can update their own policies"
  ON dealer_rental_policies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = dealer_rental_policies.dealer_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

CREATE POLICY "Dealers can insert their own policies"
  ON dealer_rental_policies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = dealer_rental_policies.dealer_id
      AND profiles.user_id = auth.uid()
      AND (profiles.role = 'dealer' OR profiles.role = 'private_host')
    )
  );

-- Admins can view all policies
CREATE POLICY "Admins can view all policies"
  ON dealer_rental_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Admins can update all policies
CREATE POLICY "Admins can update all policies"
  ON dealer_rental_policies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Function to auto-compute vehicle_tier based on year
CREATE OR REPLACE FUNCTION compute_vehicle_tier(vehicle_year INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF vehicle_year >= 2024 THEN
    RETURN 'tier4';
  ELSIF vehicle_year >= 2020 THEN
    RETURN 'tier3';
  ELSIF vehicle_year >= 2015 THEN
    RETURN 'tier2';
  ELSIF vehicle_year >= 2010 THEN
    RETURN 'tier1';
  ELSE
    RETURN 'tier1'; -- Fallback, but constraint should prevent < 2010
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update vehicle_tier when year changes
CREATE OR REPLACE FUNCTION update_vehicle_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.vehicle_tier := compute_vehicle_tier(NEW.year);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create
DROP TRIGGER IF EXISTS trigger_update_vehicle_tier ON vehicles;
CREATE TRIGGER trigger_update_vehicle_tier
  BEFORE INSERT OR UPDATE OF year ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_tier();

-- Update existing vehicles to have correct tier
UPDATE vehicles
SET vehicle_tier = compute_vehicle_tier(year)
WHERE vehicle_tier IS NULL OR vehicle_tier = 'tier2';

-- Add comments
COMMENT ON COLUMN vehicles.vehicle_tier IS 'Vehicle tier based on year: tier1 (2010-2014), tier2 (2015-2019), tier3 (2020-2023), tier4 (2024+)';
COMMENT ON COLUMN vehicles.title_type IS 'Vehicle title type: clean, rebuilt, salvage, flood, other. Platform rule: no salvage/flood/rebuilt allowed.';
COMMENT ON COLUMN vehicles.inspection_status IS 'Inspection status: pending, passed, failed. Failed vehicles cannot be published.';
COMMENT ON TABLE dealer_rental_policies IS 'Dealer-specific rental policies. Dealers can be stricter than platform rules but not looser.';
