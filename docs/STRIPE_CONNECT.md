# Stripe Connect Integration Documentation

## Overview

This document describes the Stripe Connect integration for marketplace payments, allowing automated fee deductions and payouts to dealers/hosts.

## Architecture

### Payment Flow

1. **Renter pays platform** via Stripe Checkout
2. **Platform calculates fees**:
   - Rental amount (goes to dealer)
   - Platform fee (10% - stays with platform)
   - Protection plan fee (stays with platform)
3. **Platform transfers** dealer payout amount to dealer's Stripe Connect account
4. **Dealer receives** funds in their connected account

### Stripe Connect Model

- **Express Accounts**: Dealers/hosts use Stripe Express Connect accounts
- **Platform manages onboarding**: Dealers complete onboarding via Stripe-hosted flow
- **Transfers for payouts**: Platform creates transfers to dealer accounts after payment

## Database Schema

### Profiles Table Additions

- `stripe_connect_account_id` (TEXT, nullable) - Stripe Connect Express account ID
- `stripe_connect_account_status` (TEXT, nullable) - Status: 'pending', 'active', 'restricted', 'rejected'

### Bookings Table Additions

- `dealer_payout_amount_cents` (INTEGER, nullable) - Amount to pay dealer (after platform fee)
- `platform_fee_cents` (INTEGER, nullable) - Platform commission (10%)
- `stripe_transfer_id` (TEXT, nullable) - Stripe Transfer ID for payout tracking
- `payout_status` (TEXT, nullable) - 'pending', 'transferred', 'paid_out', 'failed'
- `payout_scheduled_date` (DATE, nullable) - Optional: schedule payout date

## Stripe Connect Onboarding

### API Route: `/api/stripe/connect/onboard`

**Purpose**: Create or refresh Stripe Connect account onboarding for dealers/hosts

**Access**: Authenticated dealers/hosts only

**Process**:
1. Check if Connect account exists
2. If not, create new Express account
3. Generate account link for onboarding
4. Save account ID to profile
5. Return onboarding URL

**Response**:
```json
{
  "url": "https://connect.stripe.com/setup/s/...",
  "accountId": "acct_..."
}
```

### Onboarding Flow

1. Dealer/host clicks "Set up payments" or similar
2. Frontend calls `/api/stripe/connect/onboard`
3. User redirected to Stripe-hosted onboarding
4. User completes onboarding (bank details, identity verification)
5. Stripe redirects back to app with status
6. App can check account status via webhook or API

## Checkout Integration

### Updated Checkout Flow

The checkout API (`/api/stripe/checkout`) now:

1. **Validates dealer Connect account**:
   - Checks dealer has `stripe_connect_account_id`
   - Verifies account status is 'active'

2. **Calculates payout amounts**:
   - Rental base amount
   - Platform fee (10% of rental)
   - Dealer payout (rental - platform fee)

3. **Creates checkout session** with line items:
   - Vehicle rental
   - Platform fee
   - Protection plan fee (if applicable)

4. **Stores payout information** in booking:
   - `platform_fee_cents`
   - `dealer_payout_amount_cents`
   - `payout_status = 'pending'`

## Webhook Integration

### Event: `checkout.session.completed`

When payment succeeds:

1. **Update booking status** to 'confirmed'
2. **Create transfer** to dealer Connect account
3. **Update booking** with transfer ID and status

### Event: `transfer.created` / `transfer.paid`

Track transfer status:

- `transfer.created` → Update `payout_status = 'transferred'`
- `transfer.paid` → Update `payout_status = 'paid_out'`

## Payout Calculation

### Utility Functions

**`calculatePayoutAmounts(rentalAmountCents, platformFeePercent)`**

Calculates platform fee and dealer payout:
- Platform fee = rental × platformFeePercent
- Dealer payout = rental - platform fee

**Example**:
```typescript
// $100 rental, 10% platform fee
const { platformFeeCents, dealerPayoutCents } = calculatePayoutAmounts(10000, 0.1)
// platformFeeCents = 1000 ($10)
// dealerPayoutCents = 9000 ($90)
```

## Setup Requirements

### Stripe Dashboard Configuration

1. **Enable Stripe Connect**:
   - Go to Stripe Dashboard > Settings > Connect
   - Enable Express accounts
   - Configure branding (optional)

2. **Set up webhook endpoint**:
   - Add `/api/stripe/webhook` as webhook endpoint
   - Subscribe to events:
     - `checkout.session.completed`
     - `transfer.created`
     - `transfer.paid`
     - `account.updated` (optional - for account status changes)

3. **Configure Connect settings**:
   - Set default currency (USD)
   - Configure payout schedule (recommended: daily)
   - Set up compliance requirements

### Database Migration

Run migration `009_add_stripe_connect.sql`:

```bash
# Using Supabase CLI
supabase db push

# Or via SQL Editor
# Copy contents of supabase/migrations/009_add_stripe_connect.sql
```

## Dealer/Host Onboarding Flow

### Step 1: Initiate Onboarding

Dealer/host clicks "Set up payments" button:

```typescript
const response = await fetch('/api/stripe/connect/onboard', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
})

const { url } = await response.json()
window.location.href = url // Redirect to Stripe
```

### Step 2: Complete Onboarding

User completes Stripe-hosted onboarding:
- Business information
- Bank account details
- Identity verification (if required)

### Step 3: Return to App

Stripe redirects back with status:
- `onboarding=complete` - Onboarding completed
- `onboarding=refresh` - Onboarding needs refresh

### Step 4: Check Account Status

Frontend can check account status:

```typescript
// Query profile to check stripe_connect_account_status
const { data: profile } = await supabase
  .from('profiles')
  .select('stripe_connect_account_status')
  .eq('user_id', user.id)
  .single()

if (profile.stripe_connect_account_status === 'active') {
  // Ready to receive payouts
}
```

## Payment Flow Example

### Booking Creation

1. Renter creates booking (status: 'draft')
2. Renter selects protection plan
3. Renter proceeds to checkout

### Checkout

1. System validates:
   - Insurance election exists
   - BYOI approved + liability accepted (if applicable)
   - Dealer has active Connect account

2. System calculates:
   - Rental: $100.00
   - Platform fee: $10.00 (10%)
   - Plan fee: $15.00 (if selected)
   - Total: $125.00

3. Stripe Checkout session created with line items

4. Booking updated:
   - `platform_fee_cents = 1000`
   - `dealer_payout_amount_cents = 9000`
   - `payout_status = 'pending'`

### Payment Success

1. Webhook receives `checkout.session.completed`
2. Booking status → 'confirmed'
3. Transfer created: $90.00 to dealer account
4. Booking updated:
   - `stripe_transfer_id = 'tr_...'`
   - `payout_status = 'transferred'`

### Transfer Completion

1. Webhook receives `transfer.paid`
2. Booking updated:
   - `payout_status = 'paid_out'`

## Error Handling

### Dealer Without Connect Account

**Scenario**: Dealer hasn't completed onboarding

**Response**: 400 error with message:
```
"Dealer has not set up payment account. Please contact support."
```

**Action**: Dealer must complete Stripe Connect onboarding

### Dealer Account Not Active

**Scenario**: Dealer account exists but not active

**Response**: 400 error with message:
```
"Dealer payment account is not active. Please contact support."
```

**Action**: Check account status, may need to refresh onboarding

### Transfer Failure

**Scenario**: Transfer to dealer account fails

**Action**:
- Booking `payout_status` set to 'failed'
- Transfer can be retried manually or via admin
- Log error for review

## Security Considerations

### Access Control

- Only dealers/hosts can create Connect accounts (role check)
- Connect account IDs stored in profiles (RLS protected)
- Transfers created server-side only (webhook)

### Data Protection

- Stripe Connect account IDs stored securely
- No sensitive payment data stored in database
- All transfers logged with booking references

## Testing

### Test Mode

Use Stripe test mode for development:

1. Use test API keys
2. Create test Connect accounts
3. Use test bank accounts for payouts
4. Test with Stripe test cards

### Test Scenarios

1. **Happy path**: Complete onboarding → Create booking → Payment → Transfer
2. **Missing account**: Try checkout without Connect account
3. **Inactive account**: Try checkout with inactive account
4. **Transfer failure**: Simulate failed transfer

## Monitoring

### Key Metrics

- Connect accounts created
- Accounts by status (pending/active/restricted/rejected)
- Transfers created
- Transfer success rate
- Payout amounts by period

### Logging

- All Connect account creations
- All transfers created
- Transfer failures with error details
- Account status changes

## Future Enhancements

Potential improvements:

- **Scheduled payouts**: Delay payouts until after rental period
- **Split payments**: Handle multiple hosts for same booking
- **Refund handling**: Handle refunds with fee adjustments
- **Payout dashboard**: Show payout history to dealers
- **Automatic retries**: Retry failed transfers automatically
- **Account status webhooks**: Handle account status changes in real-time

## Troubleshooting

### "Dealer has not set up payment account"

- Verify dealer has completed Stripe Connect onboarding
- Check `profiles.stripe_connect_account_id` is set
- Check account was created successfully

### "Dealer payment account is not active"

- Check `profiles.stripe_connect_account_status`
- May need to refresh onboarding link
- Check Stripe Dashboard for account issues

### Transfer not created

- Check webhook is receiving `checkout.session.completed`
- Verify `dealer_payout_amount_cents` is set
- Check transfer creation logs for errors
- Verify Connect account is active in Stripe

### Transfer fails

- Check Stripe Dashboard for transfer failure reason
- Verify Connect account can receive transfers
- Check account compliance status
- Review Stripe logs for details