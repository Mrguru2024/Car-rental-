-- Add verification fields to profiles table
-- This migration adds columns for storing verification documents and business/renter information

-- Add verification_documents JSONB column for storing document URLs
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_documents JSONB DEFAULT NULL;

-- Add renter-specific verification fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS drivers_license_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drivers_license_state TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drivers_license_expiration DATE DEFAULT NULL;

-- Add dealer/host-specific verification fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_license_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_id TEXT DEFAULT NULL;

-- Create index on verification_documents for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_documents ON profiles USING GIN (verification_documents);

-- Add comments for documentation
COMMENT ON COLUMN profiles.verification_documents IS 'JSONB object storing URLs to verification documents (e.g., drivers_license_front, business_license, etc.)';
COMMENT ON COLUMN profiles.drivers_license_number IS 'Driver license number for renter verification';
COMMENT ON COLUMN profiles.drivers_license_state IS 'State that issued the driver license';
COMMENT ON COLUMN profiles.drivers_license_expiration IS 'Expiration date of driver license';
COMMENT ON COLUMN profiles.business_name IS 'Business name for dealer/host verification';
COMMENT ON COLUMN profiles.business_license_number IS 'Business license number';
COMMENT ON COLUMN profiles.business_address IS 'Business address';
COMMENT ON COLUMN profiles.tax_id IS 'Tax ID or EIN for business';
