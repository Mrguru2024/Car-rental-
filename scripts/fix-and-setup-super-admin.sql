-- Fix profiles role constraint and set up super admin
-- Run this in Supabase SQL Editor

-- Step 1: Fix the profiles.role CHECK constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find and drop the existing constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'profiles'::regclass
  AND conname LIKE '%role%check%'
  AND contype = 'c'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END IF;
END $$;

-- Add the new constraint with all roles
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('renter', 'dealer', 'private_host', 'admin', 'prime_admin', 'super_admin'));

-- Step 2: Set your account as super_admin
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Your user ID
  v_user_id := '4d2eac23-e673-449a-8159-9e10d8b1707b'::UUID;
  
  -- Add/update as super_admin
  PERFORM add_admin_user(
    v_user_id,
    'super_admin',
    'Super Admin'
  );
  
  RAISE NOTICE 'User % set as super_admin successfully', v_user_id;
END $$;

-- Step 3: Verify
SELECT 
  p.user_id,
  p.role,
  p.full_name,
  u.email,
  p.verification_status
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = '5epmgllc@gmail.com';

-- IMPORTANT: Password must be set via Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find user with email: 5epmgllc@gmail.com
-- 3. Click "..." menu > "Reset Password"
-- 4. Set password to: Destiny@2028
