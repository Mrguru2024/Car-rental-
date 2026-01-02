-- Add super_admin role support
-- This migration extends the role system to support super_admin without exposing it publicly

-- Note: The profiles.role column is TEXT type, so no ALTER TYPE needed
-- We just need to ensure the application logic supports super_admin

-- Create a secure function to add admin users (only callable by service role)
-- This prevents exposing admin creation to the public API

CREATE OR REPLACE FUNCTION add_admin_user(
  p_user_id UUID,
  p_role TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator's privileges (service role)
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_allowed_roles TEXT[] := ARRAY['admin', 'prime_admin', 'super_admin'];
BEGIN
  -- Validate role
  IF p_role != ALL(v_allowed_roles) THEN
    RAISE EXCEPTION 'Invalid role. Allowed roles: admin, prime_admin, super_admin';
  END IF;

  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist in auth.users';
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id) THEN
    -- Update existing profile
    UPDATE profiles
    SET 
      role = p_role,
      full_name = COALESCE(p_full_name, full_name),
      verification_status = 'approved', -- Admin users are pre-approved
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO v_profile_id;
  ELSE
    -- Create new profile
    INSERT INTO profiles (
      user_id,
      role,
      full_name,
      verification_status,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_role,
      p_full_name,
      'approved', -- Admin users are pre-approved
      NOW(),
      NOW()
    )
    RETURNING id INTO v_profile_id;
  END IF;

  RETURN v_profile_id;
END;
$$;

-- Grant execute to service role only (not public)
-- This ensures only server-side code with service role key can call this function
GRANT EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) FROM anon;

-- Add comment
COMMENT ON FUNCTION add_admin_user IS 'Securely add or update admin users. Only callable with service role key. Allowed roles: admin, prime_admin, super_admin';

-- Create a helper function to list admin users (for verification, also secured)
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return admin roles
  RETURN QUERY
  SELECT 
    p.user_id,
    p.role,
    p.full_name,
    u.email,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.role IN ('admin', 'prime_admin', 'super_admin')
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION list_admin_users() TO service_role;
REVOKE EXECUTE ON FUNCTION list_admin_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION list_admin_users() FROM authenticated;
REVOKE EXECUTE ON FUNCTION list_admin_users() FROM anon;

COMMENT ON FUNCTION list_admin_users IS 'Securely list all admin users. Only callable with service role key.';
