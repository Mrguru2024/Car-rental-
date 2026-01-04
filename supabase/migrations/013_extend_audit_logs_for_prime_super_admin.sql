-- Extend audit_logs table for Prime Admin and Super Admin support
-- Adds actor_role, previous_state, and new_state fields for better audit trail
-- Also creates the table if it doesn't exist (in case migration 005 wasn't run)

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- New columns for Prime/Super Admin support
  actor_role TEXT,
  previous_state JSONB,
  new_state JSONB,
  notes TEXT
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Add new columns to audit_logs if table already exists (from migration 005)
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS previous_state JSONB,
  ADD COLUMN IF NOT EXISTS new_state JSONB,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index on actor_role for filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON audit_logs(actor_role);

-- Enable RLS if not already enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to view their own audit logs (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'audit_logs' 
    AND policyname = 'Users can view their own audit logs'
  ) THEN
    CREATE POLICY "Users can view their own audit logs"
      ON audit_logs FOR SELECT
      USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = audit_logs.user_id));
  END IF;
END $$;

-- Update existing RLS policies
-- Drop existing admin-only policy
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

-- Create new policy: Only Prime Admin and Super Admin can view audit logs
-- Regular admins CANNOT read audit logs (per Phase 3.1 requirement)
CREATE POLICY "Prime Admin and Super Admin can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('prime_admin', 'super_admin')
    )
  );

-- Create data_access_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_type TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('read', 'export', 'delete', 'modify')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at);

ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to view their own data access logs (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'data_access_logs' 
    AND policyname = 'Users can view their own data access logs'
  ) THEN
    CREATE POLICY "Users can view their own data access logs"
      ON data_access_logs FOR SELECT
      USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = data_access_logs.user_id));
  END IF;
END $$;

-- Update data_access_logs policy
DROP POLICY IF EXISTS "Admins can view all data access logs" ON data_access_logs;

CREATE POLICY "Admin roles can view all data access logs"
  ON data_access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Create security_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'suspicious_activity', 'rate_limit_exceeded', 'unauthorized_access', 'data_breach_attempt')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Update security_events policy
DROP POLICY IF EXISTS "Admins can view all security events" ON security_events;

CREATE POLICY "Admin roles can view all security events"
  ON security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Create data_retention_policies table if it doesn't exist
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN NOT NULL DEFAULT false,
  last_cleanup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default retention policies if they don't exist
INSERT INTO data_retention_policies (resource_type, retention_days, auto_delete) VALUES
  ('audit_logs', 2555, true),
  ('bookings', 2555, false),
  ('payment_records', 2555, false),
  ('user_sessions', 90, true),
  ('verification_documents', 1095, false)
ON CONFLICT (resource_type) DO NOTHING;

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Update data_retention_policies policy (only super_admin can manage)
DROP POLICY IF EXISTS "Admins can manage retention policies" ON data_retention_policies;

CREATE POLICY "Super Admin can manage retention policies"
  ON data_retention_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Add comment
COMMENT ON COLUMN audit_logs.actor_role IS 'Role of the user who performed the action (for audit trail)';
COMMENT ON COLUMN audit_logs.previous_state IS 'State of the resource before the action (JSONB)';
COMMENT ON COLUMN audit_logs.new_state IS 'State of the resource after the action (JSONB)';
COMMENT ON COLUMN audit_logs.notes IS 'Additional notes or context for the audit entry';
