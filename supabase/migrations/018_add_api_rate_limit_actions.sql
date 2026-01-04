-- Add new rate limit action types for API calls
-- This migration ensures the rate_limits table can handle new action types
-- Note: The action_type column is TEXT, so no schema change needed
-- This migration is for documentation and validation purposes

-- Add comment to document new action types
COMMENT ON COLUMN rate_limits.action_type IS 'Action type: booking_attempt, verification_submit, listing_create, vin_lookup, api_makes, api_models, autodev_photos';

-- Create a function to validate action types (optional, for data integrity)
CREATE OR REPLACE FUNCTION validate_rate_limit_action(p_action_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_action_type IN (
    'booking_attempt',
    'verification_submit',
    'listing_create',
    'vin_lookup',
    'api_makes',
    'api_models',
    'autodev_photos'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Note: We don't add a CHECK constraint because the action types are managed in application code
-- This allows flexibility to add new action types without migrations
