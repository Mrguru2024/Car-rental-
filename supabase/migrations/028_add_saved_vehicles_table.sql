-- Saved Vehicles (Favorites) System
-- Allows renters to save/favorite vehicles for quick access

-- Create saved_vehicles table
CREATE TABLE IF NOT EXISTS saved_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(renter_id, vehicle_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_vehicles_renter_id ON saved_vehicles(renter_id);
CREATE INDEX IF NOT EXISTS idx_saved_vehicles_vehicle_id ON saved_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_saved_vehicles_created_at ON saved_vehicles(created_at DESC);

-- Enable RLS
ALTER TABLE saved_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Renters can view their own saved vehicles
CREATE POLICY "Renters can view their own saved vehicles"
  ON saved_vehicles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = saved_vehicles.renter_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Renters can insert their own saved vehicles
CREATE POLICY "Renters can save vehicles"
  ON saved_vehicles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = saved_vehicles.renter_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Renters can delete their own saved vehicles
CREATE POLICY "Renters can unsave vehicles"
  ON saved_vehicles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = saved_vehicles.renter_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Add comment
COMMENT ON TABLE saved_vehicles IS 'Renter saved/favorite vehicles for quick access';
