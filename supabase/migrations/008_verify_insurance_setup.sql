-- Verification Script for Insurance System Setup
-- This script helps verify that the insurance system is set up correctly
-- Run this after migrations 006 and 007 to check everything is in place

-- Check 1: Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'protection_plans',
        'byoi_documents',
        'booking_insurance_elections',
        'liability_acceptances',
        'claims',
        'claim_photos'
    ];
    table_name TEXT;
BEGIN
    RAISE NOTICE '=== Checking Tables Exist ===';
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = table_name;
        
        IF table_count > 0 THEN
            RAISE NOTICE '✓ Table % exists', table_name;
        ELSE
            RAISE WARNING '✗ Table % does NOT exist', table_name;
        END IF;
    END LOOP;
END $$;

-- Check 2: Verify protection plans are seeded
DO $$
DECLARE
    plan_count INTEGER;
BEGIN
    RAISE NOTICE '=== Checking Protection Plans ===';
    SELECT COUNT(*) INTO plan_count
    FROM protection_plans
    WHERE is_active = true;
    
    IF plan_count >= 3 THEN
        RAISE NOTICE '✓ Protection plans seeded (% plans found)', plan_count;
    ELSE
        RAISE WARNING '✗ Expected at least 3 protection plans, found %', plan_count;
    END IF;
END $$;

-- Check 3: Verify RLS is enabled on all tables
DO $$
DECLARE
    rls_enabled BOOLEAN;
    table_name TEXT;
    tables_to_check TEXT[] := ARRAY[
        'protection_plans',
        'byoi_documents',
        'booking_insurance_elections',
        'liability_acceptances',
        'claims',
        'claim_photos'
    ];
BEGIN
    RAISE NOTICE '=== Checking RLS Policies ===';
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        SELECT tablename INTO rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = table_name;
        
        -- Check if RLS is enabled
        SELECT CASE WHEN rowsecurity THEN true ELSE false END INTO rls_enabled
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public'
        AND t.tablename = table_name;
        
        IF rls_enabled THEN
            RAISE NOTICE '✓ RLS enabled on %', table_name;
        ELSE
            RAISE WARNING '✗ RLS NOT enabled on %', table_name;
        END IF;
    END LOOP;
END $$;

-- Check 4: Verify bookings table has new columns
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    RAISE NOTICE '=== Checking Bookings Table Updates ===';
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name IN ('plan_fee_cents', 'coverage_type');
    
    IF column_count = 2 THEN
        RAISE NOTICE '✓ Bookings table has plan_fee_cents and coverage_type columns';
    ELSE
        RAISE WARNING '✗ Bookings table missing columns (found %/2)', column_count;
    END IF;
END $$;

-- Check 5: Display protection plans details
RAISE NOTICE '=== Protection Plans Details ===';
SELECT 
    name,
    display_name,
    daily_fee_cents / 100.0 as daily_fee_usd,
    deductible_cents / 100.0 as deductible_usd,
    is_active
FROM protection_plans
ORDER BY daily_fee_cents;

-- Summary
RAISE NOTICE '=== Verification Complete ===';
RAISE NOTICE 'If you see any warnings (✗), review the migration files and re-run them if needed.';