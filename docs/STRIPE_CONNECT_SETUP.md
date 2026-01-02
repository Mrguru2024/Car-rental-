# Stripe Connect Setup Guide

This guide walks you through setting up Stripe Connect for marketplace payments.

## Prerequisites

- Stripe account with Connect enabled
- Database migration `009_add_stripe_connect.sql` applied
- Stripe webhook endpoint configured

## Step 1: Enable Stripe Connect

1. Go to Stripe Dashboard
2. Navigate to **Settings** > **Connect**
3. Click **Get started** (if not already enabled)
4. Select **Express accounts** as account type
5. Complete Connect setup wizard

## Step 2: Run Database Migration

Apply the Stripe Connect migration:

```bash
# Using Supabase CLI
supabase db push

# Or via SQL Editor
# Copy contents of supabase/migrations/009_add_stripe_connect.sql
```

This adds:
- `stripe_connect_account_id` to profiles
- `stripe_connect_account_status` to profiles
- Payout tracking fields to bookings

## Step 3: Configure Webhook Endpoints

1. Go to Stripe Dashboard > **Developers** > **Webhooks**
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Subscribe to events:
   - `checkout.session.completed`
   - `transfer.created`
   - `transfer.paid`
   - `account.updated` (optional - for account status tracking)
4. Copy webhook signing secret
5. Add to environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 4: Test Connect Onboarding

### Create Test Connect Account

1. As a dealer/host, call `/api/stripe/connect/onboard`
2. Complete Stripe onboarding flow
3. Verify account ID is saved to profile
4. Check account status in database

### Verify Account Status

```sql
SELECT 
  id, 
  role, 
  stripe_connect_account_id, 
  stripe_connect_account_status 
FROM profiles 
WHERE role IN ('dealer', 'private_host')
  AND stripe_connect_account_id IS NOT NULL;
```

## Step 5: Test Payment Flow

1. Create a booking with a dealer that has active Connect account
2. Complete checkout flow
3. Verify payment succeeds
4. Check webhook receives `checkout.session.completed`
5. Verify transfer is created
6. Check booking payout status updates

## Verification Checklist

- [ ] Connect accounts can be created
- [ ] Onboarding flow completes successfully
- [ ] Account IDs saved to database
- [ ] Checkout validates Connect account exists
- [ ] Payments process successfully
- [ ] Transfers created to dealer accounts
- [ ] Payout status tracked correctly
- [ ] Webhooks received and processed

## Troubleshooting

### Connect Account Not Created

- Verify API key has Connect permissions
- Check Stripe account has Connect enabled
- Review API logs for errors

### Onboarding Link Fails

- Verify return URLs are correct
- Check Stripe Dashboard for account issues
- Ensure HTTPS for production URLs

### Transfer Fails

- Verify Connect account is active
- Check account can receive transfers
- Review Stripe Dashboard for transfer errors
- Check account compliance status

### Webhook Not Received

- Verify webhook endpoint URL is correct
- Check webhook signing secret matches
- Test webhook endpoint is accessible
- Review Stripe Dashboard webhook logs