# Insurance System Setup Checklist

Use this checklist to ensure all setup steps are completed correctly.

## Environment Variables

- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to `.env.local`
- [ ] `NEXT_PUBLIC_APP_URL` is set correctly
- [ ] All Stripe keys are configured
- [ ] Development server restarted after adding new environment variables

## Database Migrations

- [ ] Migration `006_add_insurance_system.sql` applied successfully
- [ ] Migration `007_rls_insurance_system.sql` applied successfully
- [ ] Verified all tables exist (run verification SQL below)
- [ ] Verified protection_plans table has 3 default plans

### Quick Verification SQL

Run this in Supabase SQL Editor to verify tables exist:

```sql
-- Check tables exist
SELECT 
  'protection_plans' as table_name, 
  COUNT(*) as row_count 
FROM protection_plans
UNION ALL
SELECT 'byoi_documents', COUNT(*) FROM byoi_documents
UNION ALL
SELECT 'booking_insurance_elections', COUNT(*) FROM booking_insurance_elections
UNION ALL
SELECT 'liability_acceptances', COUNT(*) FROM liability_acceptances
UNION ALL
SELECT 'claims', COUNT(*) FROM claims
UNION ALL
SELECT 'claim_photos', COUNT(*) FROM claim_photos;

-- Check protection plans seeded
SELECT name, display_name, daily_fee_cents, deductible_cents, is_active 
FROM protection_plans 
ORDER BY daily_fee_cents;
```

Expected results:
- All tables should show row_count = 0 (except protection_plans should have 3)
- protection_plans should have 3 rows: basic ($15/day), standard ($25/day), premium ($40/day)

## Storage Buckets

- [ ] Bucket `byoi-docs` created
- [ ] Bucket `claim-photos` created
- [ ] Storage policies configured for `byoi-docs`
- [ ] Storage policies configured for `claim-photos`
- [ ] Test file upload works (optional)

### Storage Bucket Verification

1. Go to Supabase Dashboard > Storage
2. Verify both buckets exist and are private (not public)
3. Try uploading a test file to verify access

## RLS Policies

- [ ] RLS enabled on all insurance tables (should be automatic from migration)
- [ ] Test as renter: Can create own BYOI documents
- [ ] Test as admin: Can read all BYOI documents
- [ ] Test as renter: Cannot read other renters' documents

### RLS Policy Verification

The migration `007_rls_insurance_system.sql` should have enabled RLS on all tables. Verify in Supabase:

1. Go to Database > Tables
2. Check each insurance table
3. Verify "RLS enabled" badge is present

## Application Testing

### Coverage Selection Flow

- [ ] Navigate to `/checkout/[bookingId]/coverage`
- [ ] See three protection plans displayed
- [ ] Can select a protection plan
- [ ] Selection persists after page refresh
- [ ] Can navigate to BYOI upload page

### BYOI Flow

- [ ] Can upload insurance document (PDF/image)
- [ ] Can fill in policy details
- [ ] Document submission creates pending record
- [ ] Admin can see document in `/admin/byoi`
- [ ] Admin can approve/reject documents
- [ ] Approval status updates correctly

### Liability Acceptance Flow (BYOI only)

- [ ] After BYOI approval, liability page is accessible
- [ ] Acceptance text displays correctly
- [ ] Scroll detection works (checkbox enabled after scroll)
- [ ] Full name validation works
- [ ] Acceptance submission creates record
- [ ] Cannot proceed without acceptance

### Review & Checkout Flow

- [ ] Review page shows coverage selection
- [ ] Plan fee calculated correctly
- [ ] Total includes rental + platform fee + plan fee
- [ ] Stripe checkout session created successfully
- [ ] Payment redirects to Stripe

### Claims Flow

- [ ] Can navigate to `/renter/claims/new`
- [ ] Can select booking (if bookingId provided)
- [ ] Can fill in claim details
- [ ] Can upload multiple photos
- [ ] Can upload police report
- [ ] Claim submission creates record
- [ ] Photos stored correctly

### Admin Dashboard

- [ ] Admin can access `/admin/byoi`
- [ ] Pending documents display correctly
- [ ] Can view document files (read-only)
- [ ] Can approve documents with notes
- [ ] Can reject documents with notes
- [ ] Previously rejected documents show in separate section

## Stripe Integration

- [ ] Stripe checkout session includes correct line items
- [ ] Plan fee included for platform plans
- [ ] No plan fee for BYOI (plan_fee_cents = 0)
- [ ] Webhook endpoint accessible
- [ ] Webhook signature verification works
- [ ] Booking status updates to 'confirmed' after payment

### Stripe Webhook Testing (Local)

If using Stripe CLI for local testing:

```bash
# In terminal 1: Start Stripe webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret from output
# Add to .env.local as STRIPE_WEBHOOK_SECRET

# In terminal 2: Trigger test event
stripe trigger checkout.session.completed
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Missing SUPABASE_SERVICE_ROLE_KEY" | Add to .env.local and restart server |
| "Bucket not found" | Create buckets in Supabase Storage dashboard |
| "RLS policy violation" | Check RLS policies in migration 007 |
| "Insurance election required" | Complete coverage selection flow first |
| "BYOI document not approved" | Approve document in admin dashboard |
| "Liability acceptance required" | Complete liability acceptance page |

## Production Checklist

Before deploying to production:

- [ ] All migrations applied to production database
- [ ] Storage buckets created in production Supabase
- [ ] Storage policies configured
- [ ] Environment variables set in hosting platform
- [ ] Stripe webhook endpoint configured
- [ ] Stripe webhook signing secret added to production env
- [ ] Test end-to-end flow in production environment
- [ ] Monitor error logs for any issues

## Support

If you encounter issues:

1. Check the [Insurance Setup Guide](./INSURANCE_SETUP.md) for detailed instructions
2. Review [Insurance System Documentation](./INSURANCE.md) for system architecture
3. Check Supabase logs for database errors
4. Check browser console for client-side errors
5. Verify all environment variables are set correctly
6. Ensure migrations were applied in correct order