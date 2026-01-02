# Insurance & Protection Plans Documentation

## Overview

This document outlines the insurance and protection plan system for the car rental marketplace. The system provides renters with two coverage options: Platform Protection Plans or Bring Your Own Insurance (BYOI).

## Important Language Rules

### Protection Plan Terminology

- **Always use**: "Protection Plan" (never "insurance product" or "insurance policy")
- **Always use**: "Choose a Protection Plan" (not "purchase insurance")
- **Always use**: "Coverage" (not "insurance coverage")
- **Legal-safe language**: All public-facing text must clearly present protection plans as optional coverage options, not as insurance products

### BYOI Terminology

- **Always use**: "Bring Your Own Insurance" or "BYOI"
- **Always use**: "Insurance document" or "policy declaration page" (not "insurance product")
- **Never claim**: That the platform provides or sells insurance

## Protection Plans

### Default Plans

The system includes three default protection plans:

1. **Basic Protection Plan**
   - Daily fee: $15.00
   - Deductible: $500.00

2. **Standard Protection Plan**
   - Daily fee: $25.00
   - Deductible: $300.00

3. **Premium Protection Plan**
   - Daily fee: $40.00
   - Deductible: $150.00

These plans can be edited by admins through the database. All plans are stored in the `protection_plans` table.

### Plan Selection Flow

1. Renter reaches checkout coverage selection page (`/checkout/[bookingId]/coverage`)
2. Renter views available active protection plans
3. Renter selects a plan OR chooses "Bring Your Own Insurance"
4. System creates/updates `booking_insurance_elections` record
5. System calculates plan fee based on rental duration (days × daily fee)
6. System stores coverage snapshot (frozen plan details) in `coverage_snapshot_json`
7. System updates `bookings.plan_fee_cents` and `bookings.coverage_type`

### Coverage Snapshot

When a protection plan is selected, the system stores a snapshot of the plan details at the time of selection:

```json
{
  "plan_name": "basic",
  "display_name": "Basic Protection Plan",
  "daily_fee_cents": 1500,
  "deductible_cents": 50000,
  "description": "Essential coverage for your rental"
}
```

This snapshot ensures that even if plan details change in the future, the rental agreement reflects the terms at the time of selection.

## Bring Your Own Insurance (BYOI)

### BYOI Workflow

1. **Document Upload** (`/checkout/[bookingId]/byoi`)
   - Renter uploads insurance declaration page
   - Renter fills in policy details (policyholder name, policy number, insurer, effective/expiration dates)
   - System creates `byoi_documents` record with status `pending`
   - System creates/updates `booking_insurance_elections` with `coverage_type = 'byoi'`

2. **Admin Review** (`/admin/byoi`)
   - Admin reviews pending BYOI documents
   - Admin can approve or reject documents
   - Admin can add notes explaining rejection

3. **Liability Acceptance** (`/checkout/[bookingId]/liability`)
   - Required only for BYOI coverage
   - Renter must scroll through and read acceptance text
   - Renter checks acceptance checkbox
   - Renter types full name to confirm
   - System creates `liability_acceptances` record

4. **Checkout Validation**
   - System verifies BYOI document status = `approved`
   - System verifies liability acceptance exists
   - If both valid, renter can proceed to payment

### BYOI Document Requirements

- File upload: PDF, JPG, JPEG, or PNG
- Required fields:
  - Policyholder name
  - Effective date
  - Expiration date
- Optional fields:
  - Policy number
  - Insurer name
  - Coverage notes

### BYOI Approval Statuses

- `pending`: Document submitted, awaiting admin review
- `approved`: Document approved, renter can proceed
- `rejected`: Document rejected, admin notes explain why

### Storage

BYOI documents are stored in the `byoi-docs` Supabase storage bucket. Access is restricted:
- Only the uploading renter can read/write their files
- Admins can read all files

## Coverage Selection Enforcement

### Business Rules

1. **No booking can reach checkout without a recorded coverage election**
   - If no `booking_insurance_elections` record exists, redirect to `/checkout/[bookingId]/coverage`

2. **Platform Plan Requirements**
   - `protection_plan_id` must not be null
   - `plan_fee_cents` must be computed and stored
   - Coverage snapshot must be stored

3. **BYOI Requirements**
   - `byoi_documents.status` must be `'approved'`
   - `liability_acceptances` record must exist for the booking
   - Both conditions must be met before checkout

### Validation Points

- Coverage selection page: Creates election record
- Review page: Validates election exists and is valid
- Stripe checkout API: Validates election and BYOI requirements before creating payment session

## Claims Intake

### Claims Flow

1. Renter navigates to `/renter/claims/new`
2. Renter selects booking (or enters booking ID)
3. Renter fills in:
   - Incident date & time (required)
   - Description (required)
   - Photos (optional, multiple)
   - Police report (optional, PDF)
4. System creates `claims` record with status `submitted`
5. System creates `claim_photos` records for uploaded photos
6. System determines `coverage_type` from booking's insurance election

### Claims Statuses

- `submitted`: Claim filed, awaiting review
- `in_review`: Claim under review by admin
- `closed`: Claim resolved

### Storage

Claim photos and police reports are stored in the `claim-photos` Supabase storage bucket. Access is restricted:
- Only the renter associated with the claim can read/write photos
- Admins can read all claim photos

## Admin Approvals

### BYOI Approval Dashboard

Located at `/admin/byoi`, this dashboard allows admins to:

1. View all pending BYOI documents
2. View previously rejected documents
3. Approve documents (with optional admin notes)
4. Reject documents (with required admin notes explaining rejection)
5. View document files (read-only links to Supabase storage)

### Access Control

- Only users with `profiles.role = 'admin'` can access the dashboard
- RLS policies ensure admins can read/update all BYOI documents

## Compliance & Data Storage

### Stored Evidence

For compliance and legal purposes, the system stores:

1. **Coverage Elections**
   - Which coverage type was selected
   - Plan details (snapshot)
   - Timestamp of selection

2. **BYOI Documents**
   - Policyholder information
   - Policy dates
   - Document file (stored securely)
   - Approval status and admin notes

3. **Liability Acceptances** (BYOI only)
   - Acceptance text version
   - Full acceptance text
   - Typed full name
   - Acceptance timestamp
   - IP address (if available)
   - User agent

4. **Claims**
   - Incident details
   - Description
   - Photos
   - Police reports (if provided)
   - Status and admin notes

All data is stored in Supabase with Row-Level Security (RLS) policies enforcing proper access controls.

## Storage Buckets

### byoi-docs

- Purpose: Store BYOI insurance declaration pages
- Access: Renters can read/write own files; admins can read all

### claim-photos

- Purpose: Store claim photos and police reports
- Access: Renters can read/write photos for own claims; admins can read all

### Storage Policy Implementation

Storage bucket policies should be configured in Supabase dashboard to match the access rules described above. If bucket policies cannot be expressed cleanly in SQL, document the rules here and add TODO for Supabase dashboard configuration.

## Integration with Booking Flow

### Checkout Flow

1. Booking created with status `draft`
2. Renter navigates to `/checkout/[bookingId]/coverage`
3. Renter selects coverage option
4. If platform plan: Renter proceeds to `/checkout/[bookingId]/review`
5. If BYOI:
   - Upload document at `/checkout/[bookingId]/byoi`
   - Wait for admin approval
   - Accept liability at `/checkout/[bookingId]/liability`
   - Proceed to `/checkout/[bookingId]/review`
6. Review page validates coverage and shows summary
7. Renter clicks "Proceed to Payment"
8. Stripe checkout session created with line items:
   - Rental base
   - Platform fee (10%)
   - Protection plan fee (if platform plan)
9. Payment processed via Stripe
10. Webhook confirms booking, status changes to `confirmed`

### Status Transitions

- `draft` → Coverage selection required
- `pending_payment` → Coverage validated, payment in progress
- `confirmed` → Payment completed, booking confirmed

## Future Considerations

This MVP implementation includes:

- ✅ Protection plan selection
- ✅ BYOI upload and approval
- ✅ Liability acceptance (BYOI only)
- ✅ Claims intake
- ✅ Admin approval dashboard
- ✅ Coverage enforcement in checkout

Post-MVP enhancements might include:

- Claims management dashboard
- Automated BYOI document verification
- Integration with insurance APIs
- Claims processing workflows
- Coverage analytics and reporting