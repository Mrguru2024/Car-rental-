-- Update vehicle_image_map provider constraint to use autodev instead of vinaudit
-- This migration updates the provider check constraint to allow 'autodev' instead of 'vinaudit'
-- Also creates the table if it doesn't exist (in case migration 004 wasn't run)

-- Create vehicle_image_map table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicle_image_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_key_hash TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('autodev', 'host_upload', 'fallback')),
  image_urls JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_vehicle_image_map_key_hash ON vehicle_image_map(vehicle_key_hash);

-- Drop the old constraint if it exists (in case it was created with 'vinaudit')
ALTER TABLE vehicle_image_map
DROP CONSTRAINT IF EXISTS vehicle_image_map_provider_check;

-- Add new constraint with autodev
ALTER TABLE vehicle_image_map
ADD CONSTRAINT vehicle_image_map_provider_check 
CHECK (provider IN ('autodev', 'host_upload', 'fallback'));

-- Update any existing 'vinaudit' records to 'autodev' (if any exist)
UPDATE vehicle_image_map
SET provider = 'autodev'
WHERE provider = 'vinaudit';

-- Add comment
COMMENT ON TABLE vehicle_image_map IS 'Cached vehicle images from Auto.dev API or fallback placeholders';
COMMENT ON COLUMN vehicle_image_map.provider IS 'Image source provider: autodev (Auto.dev API), host_upload (dealer uploaded), or fallback (placeholder)';
