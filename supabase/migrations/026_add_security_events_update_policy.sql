-- Add UPDATE RLS policy for security_events table
-- Allows admin roles to resolve security events

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Admin roles can update security events" ON security_events;

-- Create UPDATE policy for admin roles to resolve security events
CREATE POLICY "Admin roles can update security events"
  ON security_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'prime_admin', 'super_admin')
    )
  );

-- Ensure log_security_event function has SECURITY DEFINER to bypass RLS for inserts
-- This allows server-side code to log security events without needing INSERT policies
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator's privileges to bypass RLS for inserts
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO security_events (
    user_id, event_type, severity, description, ip_address, user_agent, metadata
  ) VALUES (
    p_user_id, p_event_type, p_severity, p_description, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;
