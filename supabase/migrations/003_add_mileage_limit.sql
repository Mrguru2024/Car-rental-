-- Add mileage_limit column to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS mileage_limit INTEGER;

-- Add comment
COMMENT ON COLUMN vehicles.mileage_limit IS 'Maximum miles allowed per rental period (null means unlimited)';
