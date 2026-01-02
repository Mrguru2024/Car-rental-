# Insurance System Setup Guide

This guide walks you through setting up the insurance and liability system for the car rental platform.

## Prerequisites

- Supabase project configured
- Stripe account configured
- Database migrations ready to apply

## Step 1: Update Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
```

**How to get your Service Role Key:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Find the **service_role** key (under "Project API keys")
4. Copy the key and add it to your `.env.local`

⚠️ **Important**: The service role key bypasses Row-Level Security (RLS). Keep it secure and never commit it to version control. Only use it in server-side code.

## Step 2: Run Database Migrations

The insurance system requires two migration files to be applied to your Supabase database:

1. `supabase/migrations/006_add_insurance_system.sql` - Creates all insurance-related tables
2. `supabase/migrations/007_rls_insurance_system.sql` - Sets up Row-Level Security policies

**Optional**: After running migrations, you can run `supabase/migrations/008_verify_insurance_setup.sql` to verify everything was set up correctly.

### Option A: Using Supabase CLI (Recommended)

If you have the Supabase CLI installed:

```bash
# Make sure you're linked to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/006_add_insurance_system.sql`
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** to execute
6. Repeat for `supabase/migrations/007_rls_insurance_system.sql`

### Option C: Using psql or Database Client

If you have direct database access:

```bash
# Connect to your database
psql -h your-db-host -U postgres -d postgres

# Run migrations in order
\i supabase/migrations/006_add_insurance_system.sql
\i supabase/migrations/007_rls_insurance_system.sql
```

### Verify Migrations

After running migrations, verify the tables were created:

```sql
-- Check that tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'protection_plans',
  'byoi_documents',
  'booking_insurance_elections',
  'liability_acceptances',
  'claims',
  'claim_photos'
);

-- Check that protection_plans were seeded
SELECT name, display_name, daily_fee_cents, deductible_cents 
FROM protection_plans 
WHERE is_active = true;
```

You should see 3 protection plans (basic, standard, premium).

## Step 3: Configure Storage Buckets

Create and configure two new storage buckets in Supabase for insurance-related files.

### Create Buckets

1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Click **New bucket**
4. Create the following buckets:

#### Bucket 1: `byoi-docs`
- **Name**: `byoi-docs`
- **Public**: No (private)
- **File size limit**: 10 MB (adjust as needed)
- **Allowed MIME types**: `application/pdf,image/jpeg,image/png,image/jpg`

#### Bucket 2: `claim-photos`
- **Name**: `claim-photos`
- **Public**: No (private)
- **File size limit**: 50 MB (adjust as needed)
- **Allowed MIME types**: `application/pdf,image/jpeg,image/png,image/jpg`

### Configure Storage Policies

For each bucket, you need to set up storage policies. Go to **Storage** > **[Bucket Name]** > **Policies**.

#### Policy for `byoi-docs` bucket

**Policy 1: Renters can upload their own documents**
- Policy name: "Renters can upload BYOI documents"
- Allowed operation: INSERT
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'byoi-docs'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

**Policy 2: Renters can read their own documents**
- Policy name: "Renters can read own BYOI documents"
- Allowed operation: SELECT
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'byoi-docs'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

**Policy 3: Admins can read all documents**
- Policy name: "Admins can read all BYOI documents"
- Allowed operation: SELECT
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'byoi-docs'::text) 
AND (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
```

**Policy 4: Renters can update their own documents**
- Policy name: "Renters can update own BYOI documents"
- Allowed operation: UPDATE
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'byoi-docs'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy for `claim-photos` bucket

**Policy 1: Renters can upload claim photos**
- Policy name: "Renters can upload claim photos"
- Allowed operation: INSERT
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'claim-photos'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

**Policy 2: Renters can read their own claim photos**
- Policy name: "Renters can read own claim photos"
- Allowed operation: SELECT
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'claim-photos'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

**Policy 3: Admins can read all claim photos**
- Policy name: "Admins can read all claim photos"
- Allowed operation: SELECT
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'claim-photos'::text) 
AND (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
```

**Policy 4: Renters can delete their own claim photos**
- Policy name: "Renters can delete own claim photos"
- Allowed operation: DELETE
- Target roles: authenticated
- Policy definition:
```sql
(bucket_id = 'claim-photos'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

### Alternative: Simplified Policies (if folder-based policies don't work)

If the folder-based policies above don't work with your setup, you can use service role key for file access in your application code (server-side only). The RLS policies on the database tables will still enforce access control at the data level.

**Note**: The application code uses the file paths stored in the database, so RLS on the `byoi_documents` and `claim_photos` tables provides the primary access control.

## Step 4: Verify Setup

### Test Protection Plans

1. Start your development server: `npm run dev`
2. Create a test booking (or use an existing draft booking)
3. Navigate to `/checkout/[bookingId]/coverage`
4. You should see three protection plan options (Basic, Standard, Premium)
5. Verify you can select a plan and proceed

### Test BYOI Flow

1. Navigate to `/checkout/[bookingId]/coverage`
2. Click "Bring Your Own Insurance"
3. Upload a test insurance document (PDF or image)
4. Fill in the policy details
5. Submit for approval
6. As an admin, navigate to `/admin/byoi`
7. Verify you can see the pending document
8. Approve or reject the document
9. Complete the liability acceptance flow

### Test Claims

1. Navigate to `/renter/claims/new?bookingId=[some-booking-id]`
2. Fill in claim details
3. Upload photos
4. Submit claim
5. Verify claim appears in database

## Step 5: Configure Stripe Webhook (Production)

For production, you need to configure the Stripe webhook endpoint:

1. Go to Stripe Dashboard > **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
5. Copy the webhook signing secret
6. Add it to your production environment variables as `STRIPE_WEBHOOK_SECRET`

For local development, you can use Stripe CLI:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook signing secret to use in `.env.local`.

## Troubleshooting

### Migration Errors

**Error: "relation already exists"**
- Some tables may already exist. The migrations use `IF NOT EXISTS`, so this shouldn't happen, but if it does, check your database state.

**Error: "permission denied"**
- Make sure you're using a database user with sufficient permissions (typically the `postgres` role or service role).

### Storage Bucket Errors

**Error: "Bucket not found"**
- Verify the bucket names are exactly `byoi-docs` and `claim-photos` (case-sensitive).
- Make sure buckets are created before testing file uploads.

**Error: "new row violates row-level security policy"**
- Check that RLS policies are correctly applied on the storage buckets.
- Verify the user's profile exists and has the correct role.
- Check that file paths match the expected pattern (user_id in path).

### API Errors

**Error: "Missing SUPABASE_SERVICE_ROLE_KEY"**
- Verify the environment variable is set in `.env.local`
- Restart your development server after adding the variable
- Check that the variable name is exactly `SUPABASE_SERVICE_ROLE_KEY`

**Error: "Insurance election required"**
- Make sure the coverage selection flow is completed before checkout
- Verify `booking_insurance_elections` table has a record for the booking

### BYOI Approval Issues

**Documents not appearing in admin dashboard**
- Check that you're logged in as a user with `role = 'admin'` in the profiles table
- Verify RLS policies allow admins to read `byoi_documents`
- Check browser console for errors

## Next Steps

After setup is complete:

1. Review the protection plan pricing in the database (edit via Supabase dashboard if needed)
2. Test the complete checkout flow end-to-end
3. Set up admin accounts for BYOI document review
4. Configure production Stripe webhook
5. Monitor the system for any issues

## Additional Resources

- [Insurance System Documentation](./INSURANCE.md) - Detailed system documentation
- [Liability Acceptance Documentation](./LIABILITY.md) - Liability workflow details
- [Environment Setup Guide](./ENVIRONMENT_SETUP.md) - Complete environment variable reference
- [SOP Documentation](./sop.md) - Standard Operating Procedures