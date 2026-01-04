-- Fix profiles.role CHECK constraint to include admin roles
-- This migration updates the constraint to allow admin, prime_admin, and super_admin roles

-- First, find and drop the existing constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'profiles'::regclass
  AND conname LIKE '%role%check%'
  AND contype = 'c'
  LIMIT 1;

  -- Drop it if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No existing role constraint found (constraint may have different name or not exist)';
  END IF;
END $$;

-- Add the new constraint that includes all roles
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('renter', 'dealer', 'private_host', 'admin', 'prime_admin', 'super_admin'));

-- Verify the constraint was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
    AND conname = 'profiles_role_check'
    AND contype = 'c'
  ) THEN
    RAISE NOTICE 'Successfully added profiles_role_check constraint with all roles';
  ELSE
    RAISE WARNING 'Constraint profiles_role_check was not created';
  END IF;
END $$;
