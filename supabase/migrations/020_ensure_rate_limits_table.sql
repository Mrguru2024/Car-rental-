-- Ensure rate_limits table exists (idempotent)
-- This migration ensures the rate_limits table is created even if migration 004 wasn't run

-- Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- user_id or IP address
  action_type TEXT NOT NULL, -- 'booking_attempt', 'verification_submit', etc.
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, action_type, window_start)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Enable RLS if not already enabled
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate (idempotent)
DROP POLICY IF EXISTS "No client access to rate_limits" ON rate_limits;
CREATE POLICY "No client access to rate_limits"
  ON rate_limits FOR ALL
  USING (false);

-- Update comment on action_type column to include new action types
COMMENT ON COLUMN rate_limits.action_type IS 'Action type: booking_attempt, verification_submit, listing_create, vin_lookup, api_makes, api_models, autodev_photos, recall_lookup';
