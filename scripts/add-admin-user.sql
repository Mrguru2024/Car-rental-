-- Script to Add Admin Users
-- 
-- IMPORTANT SECURITY NOTES:
-- 1. This script must be run using the SERVICE ROLE key (not anon key)
-- 2. Run this from server-side code or database console with service role access
-- 3. Never expose this script or service role key to client-side code
-- 4. Store service role key securely in environment variables
--
-- Usage:
-- 1. Get the user_id from auth.users table after user signs up
-- 2. Run this script with service role credentials
-- 3. Or use the add_admin_user() function from server-side code
--

-- ============================================================================
-- OPTION 1: Using the secure function (RECOMMENDED)
-- ============================================================================

-- Add a regular admin
-- SELECT add_admin_user(
--   'USER_ID_HERE'::UUID,  -- Replace with actual user_id from auth.users
--   'admin',
--   'Admin User Name',     -- Optional
--   'admin@example.com'    -- Optional (for reference only, stored in auth.users)
-- );

-- Add a prime admin (admin + audit access)
-- SELECT add_admin_user(
--   'USER_ID_HERE'::UUID,
--   'prime_admin',
--   'Prime Admin User Name',
--   'primeadmin@example.com'
-- );

-- Add a super admin (all access + dev tools)
-- SELECT add_admin_user(
--   'USER_ID_HERE'::UUID,
--   'super_admin',
--   'Super Admin User Name',
--   'superadmin@example.com'
-- );

-- ============================================================================
-- OPTION 2: Direct SQL (if function is not available)
-- ============================================================================

-- WARNING: Only use this if you're running from a secure environment
-- (database console with service role access, not from application code)

/*
-- First, get the user_id from auth.users:
-- SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Then update or insert the profile:
INSERT INTO profiles (
  user_id,
  role,
  full_name,
  verification_status,
  created_at,
  updated_at
)
VALUES (
  'USER_ID_HERE'::UUID,  -- Replace with actual user_id
  'admin',               -- or 'prime_admin' or 'super_admin'
  'Admin Name',          -- Optional
  'approved',            -- Admin users are pre-approved
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = EXCLUDED.role,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  verification_status = 'approved',
  updated_at = NOW();
*/

-- ============================================================================
-- VERIFY ADMIN USERS
-- ============================================================================

-- List all admin users (using secure function)
-- SELECT * FROM list_admin_users();

-- Or direct query (if you have service role access):
-- SELECT 
--   p.user_id,
--   p.role,
--   p.full_name,
--   u.email,
--   p.verification_status,
--   p.created_at
-- FROM profiles p
-- JOIN auth.users u ON u.id = p.user_id
-- WHERE p.role IN ('admin', 'prime_admin', 'super_admin')
-- ORDER BY p.role, p.created_at DESC;

-- ============================================================================
-- EXAMPLE: Complete workflow
-- ============================================================================

-- Step 1: User signs up through normal flow (gets user_id)
-- Step 2: Get the user_id from auth.users:
-- SELECT id, email FROM auth.users WHERE email = 'newadmin@example.com';

-- Step 3: Add admin role using secure function:
-- SELECT add_admin_user(
--   (SELECT id FROM auth.users WHERE email = 'newadmin@example.com'),
--   'super_admin',
--   'Super Admin',
--   'newadmin@example.com'
-- );

-- Step 4: Verify:
-- SELECT * FROM list_admin_users() WHERE email = 'newadmin@example.com';
