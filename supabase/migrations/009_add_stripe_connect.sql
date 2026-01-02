-- Stripe Connect Integration Migration
-- Adds support for marketplace payments with automated fee deductions

-- 1. Add Stripe Connect account ID to profiles (for dealers and hosts)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_status TEXT CHECK (stripe_connect_account_status IN ('pending', 'active', 'restricted', 'rejected')) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_id ON profiles(stripe_connect_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_status ON profiles(stripe_connect_account_status);

-- 2. Add payout tracking fields to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS dealer_payout_amount_cents INTEGER CHECK (dealer_payout_amount_cents >= 0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER CHECK (platform_fee_cents >= 0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_status TEXT CHECK (payout_status IN ('pending', 'transferred', 'paid_out', 'failed')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payout_scheduled_date DATE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payout_status ON bookings(payout_status);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_transfer_id ON bookings(stripe_transfer_id);

-- 3. Add payout status to existing bookings (set to NULL for old bookings)
-- This migration only adds columns, existing data remains unchanged

-- Comments for documentation
COMMENT ON COLUMN profiles.stripe_connect_account_id IS 'Stripe Connect Express account ID for dealers/hosts to receive payouts';
COMMENT ON COLUMN profiles.stripe_connect_account_status IS 'Status of Stripe Connect account onboarding';
COMMENT ON COLUMN bookings.dealer_payout_amount_cents IS 'Amount to be paid to dealer/host (after platform fee deduction)';
COMMENT ON COLUMN bookings.platform_fee_cents IS 'Platform commission fee for this booking';
COMMENT ON COLUMN bookings.stripe_transfer_id IS 'Stripe Transfer ID for tracking payout to dealer/host';
COMMENT ON COLUMN bookings.payout_status IS 'Status of payout to dealer/host';
COMMENT ON COLUMN bookings.payout_scheduled_date IS 'Date when payout is scheduled (typically after rental period)';