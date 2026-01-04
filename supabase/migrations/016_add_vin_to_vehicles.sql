-- Add VIN column to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS vin TEXT;

-- Create index on VIN for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);

-- Add comment
COMMENT ON COLUMN vehicles.vin IS 'Vehicle Identification Number (17 characters)';
