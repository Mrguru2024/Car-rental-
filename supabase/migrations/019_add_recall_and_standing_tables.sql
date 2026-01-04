-- Recall Badge & Vehicle Standing System
-- FREE-only phase: Uses NHTSA Recalls API (free, public)

-- 1. Vehicle Recall Cache Table
-- Purpose: Cache recall lookups to reduce NHTSA API calls and respect rate limits
CREATE TABLE IF NOT EXISTS vehicle_recall_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vin TEXT, -- Store if available (dealer may provide)
  model_year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  recall_count INTEGER NOT NULL DEFAULT 0,
  severity_level TEXT NOT NULL DEFAULT 'none' CHECK (severity_level IN ('none', 'info', 'caution', 'urgent')),
  badge_label TEXT NOT NULL DEFAULT 'No Recalls Found',
  badge_color TEXT NOT NULL DEFAULT 'green' CHECK (badge_color IN ('green', 'yellow', 'red', 'gray')),
  recall_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_recall_cache_vehicle_id ON vehicle_recall_cache(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_recall_cache_expires_at ON vehicle_recall_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_recall_cache_make_model_year ON vehicle_recall_cache(make, model, model_year);

-- 2. Vehicle Standing Table
-- Purpose: Store a simple trust/credibility score renters can understand
CREATE TABLE IF NOT EXISTS vehicle_standing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  standing_grade TEXT NOT NULL DEFAULT 'A' CHECK (standing_grade IN ('A', 'B', 'C', 'D', 'F')),
  standing_score INTEGER NOT NULL DEFAULT 100 CHECK (standing_score >= 0 AND standing_score <= 100),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_standing_vehicle_id ON vehicle_standing(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_standing_grade ON vehicle_standing(standing_grade);
CREATE INDEX IF NOT EXISTS idx_vehicle_standing_score ON vehicle_standing(standing_score);

-- Enable RLS
ALTER TABLE vehicle_recall_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_standing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_recall_cache
-- Public read allowed for recall data tied to active listings (no PII)
CREATE POLICY "Public can view recall cache for active vehicles"
  ON vehicle_recall_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_recall_cache.vehicle_id
      AND vehicles.status = 'active'
    )
  );

-- Owners (dealer/admin) can read their vehicles' recall data
CREATE POLICY "Dealers can view their vehicles' recall cache"
  ON vehicle_recall_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_recall_cache.vehicle_id
      AND vehicles.dealer_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Only server/admin can write (via service role)
CREATE POLICY "Service role can manage recall cache"
  ON vehicle_recall_cache FOR ALL
  USING (false)
  WITH CHECK (false);

-- RLS Policies for vehicle_standing
-- Public read allowed for standing data tied to active listings
CREATE POLICY "Public can view standing for active vehicles"
  ON vehicle_standing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_standing.vehicle_id
      AND vehicles.status = 'active'
    )
  );

-- Owners (dealer/admin) can read their vehicles' standing
CREATE POLICY "Dealers can view their vehicles' standing"
  ON vehicle_standing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_standing.vehicle_id
      AND vehicles.dealer_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Only server/admin can write (via service role)
CREATE POLICY "Service role can manage vehicle standing"
  ON vehicle_standing FOR ALL
  USING (false)
  WITH CHECK (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_recall_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_vehicle_standing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_vehicle_recall_cache_updated_at ON vehicle_recall_cache;
CREATE TRIGGER trigger_update_vehicle_recall_cache_updated_at
  BEFORE UPDATE ON vehicle_recall_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_recall_cache_updated_at();

DROP TRIGGER IF EXISTS trigger_update_vehicle_standing_updated_at ON vehicle_standing;
CREATE TRIGGER trigger_update_vehicle_standing_updated_at
  BEFORE UPDATE ON vehicle_standing
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_standing_updated_at();
