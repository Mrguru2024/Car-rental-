-- Setup Super Admin Account
-- Run this in Supabase SQL Editor
-- This script will:
-- 1. Find the user by email
-- 2. Set their role to super_admin
-- Note: Password must be set via Supabase Dashboard > Authentication > Users (or via Admin API)

-- Step 1: Get the user_id for the email
SELECT id, email, phone, created_at 
FROM auth.users 
WHERE email = '5epmgllc@gmail.com';

-- Step 2: Set the user as super_admin (replace USER_ID_HERE with the id from Step 1)
-- If the user doesn't have a profile yet, this will create one
-- If they have a profile, this will update it to super_admin

-- OPTION A: If you have the user_id, run this (replace USER_ID_HERE):
/*
SELECT add_admin_user(
  'USER_ID_HERE'::UUID,  -- Replace with the actual user_id from Step 1
  'super_admin',
  'Super Admin'  -- Optional: Set a full name
);
*/

-- OPTION B: Using the email directly (if you prefer):
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = '5epmgllc@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email 5epmgllc@gmail.com not found';
  END IF;
  
  -- Add/update as super_admin
  PERFORM add_admin_user(
    v_user_id,
    'super_admin',
    'Super Admin'
  );
  
  RAISE NOTICE 'User % set as super_admin successfully', v_user_id;
END $$;

-- Step 3: Verify the admin was created
SELECT * FROM list_admin_users() WHERE email = '5epmgllc@gmail.com';

-- IMPORTANT: To set the password, you have two options:
-- 
-- Option 1: Via Supabase Dashboard
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find the user with email 5epmgllc@gmail.com
-- 3. Click "..." menu > "Reset Password"
-- 4. Set password to: Destiny@2028
--
-- Option 2: Via Supabase Admin API (from server-side code)
-- Use the admin client to update the password:
-- adminSupabase.auth.admin.updateUserById(userId, { password: 'Destiny@2028' })
