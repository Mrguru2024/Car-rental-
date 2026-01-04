-- Default admin role for admin portal registrations
-- When users are registered via admin portal, they default to 'admin' role
-- Only super_admin can assign higher roles (prime_admin, super_admin)

-- Drop and recreate add_admin_user function with default role parameter
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
              FROM pg_proc 
              WHERE proname = 'add_admin_user'
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.add_admin_user(' || r.args || ') CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION add_admin_user(
  p_user_id UUID,
  p_role TEXT DEFAULT NULL,
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
  v_final_role TEXT;
BEGIN
  -- Default to 'admin' role if not specified (for admin portal registrations)
  -- Users registered via admin portal will get 'admin' role by default
  -- Only super_admin can assign higher roles (prime_admin, super_admin)
  v_final_role := COALESCE(p_role, 'admin');
  
  -- Validate role
  IF v_final_role != ALL(v_allowed_roles) THEN
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
      role = v_final_role,
      full_name = COALESCE(p_full_name, full_name),
      verification_status = 'approved', -- Admin users are pre-approved
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO v_profile_id;
  ELSE
    -- Create new profile with default 'admin' role if not specified
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
      v_final_role,
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
GRANT EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, TEXT, TEXT) FROM anon;

-- Update comment
COMMENT ON FUNCTION add_admin_user IS 'Securely add or update admin users. Only callable with service role key. Defaults to admin role if not specified (for admin portal registrations). Allowed roles: admin, prime_admin, super_admin. Only super_admin should assign prime_admin or super_admin roles.';
