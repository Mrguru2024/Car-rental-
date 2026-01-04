# Bring Your Own Insurance (BYOI) Plan Documentation

**Last Updated:** January 3, 2025

## Overview

This document outlines the Bring Your Own Insurance (BYOI) option for renters who choose to use their personal insurance policy instead of selecting a platform Protection Plan.

## Important Legal Language

**CARSERA IS NOT AN INSURANCE PROVIDER.** We do not provide, sell, or administer insurance products. BYOI is an option that allows renters to rely on their own insurance coverage.

### Terminology

- **Always use**: "Bring Your Own Insurance" or "BYOI"
- **Always use**: "Insurance document" or "policy declaration page" (not "insurance product")
- **Never claim**: That the platform provides or sells insurance
- **Always clarify**: That renters are using their own insurance policy

## BYOI Option

### What is BYOI?

BYOI allows renters to use their existing personal auto insurance policy to cover their rental vehicle, provided the policy meets certain requirements and is approved by Carsera administrators.

### When BYOI is Available

BYOI is available as an option during the checkout process when:

- The renter has an active personal auto insurance policy
- The renter's policy meets state minimum coverage requirements
- The renter is willing to accept full personal liability

## BYOI Requirements

### 1. Insurance Policy Requirements

The renter's insurance policy must:

- Be active and in good standing
- Meet or exceed state minimum liability coverage requirements
- Cover the rental vehicle (check with your insurer)
- Remain active for the entire rental period
- Be issued by a licensed insurance company

### 2. Required Documentation

Renters must provide:

- **Insurance Declaration Page** (PDF, JPG, JPEG, or PNG)
  - Must show policyholder name
  - Must show effective and expiration dates
  - Must show coverage types and limits
  - Must be current and valid

- **Policy Information:**
  - Policyholder name (must match renter's name)
  - Policy number (if available)
  - Insurer name
  - Effective date (required)
  - Expiration date (required)
  - Coverage notes (optional)

### 3. Coverage Minimums

The insurance policy must meet or exceed:

- **State minimum liability coverage** (varies by state)
- **Property damage coverage** as required by law
- **Bodily injury coverage** as required by law

**Note:** Renters should verify with their insurance company that their policy covers rental vehicles. Some policies may exclude commercial rentals or peer-to-peer rentals.

## BYOI Workflow

### Step 1: Coverage Selection

1. During checkout, renter reaches the coverage selection page
2. Renter chooses "Bring Your Own Insurance" option
3. System creates a booking insurance election record with `coverage_type = 'byoi'`

### Step 2: Document Upload

1. Renter navigates to `/checkout/[bookingId]/byoi`
2. Renter uploads insurance declaration page
3. Renter fills in required policy information:
   - Policyholder name (required)
   - Effective date (required)
   - Expiration date (required)
   - Policy number (optional)
   - Insurer name (optional)
   - Coverage notes (optional)
4. System creates `byoi_documents` record with status `pending`
5. Document is stored securely in `byoi-docs` storage bucket

### Step 3: Admin Review

1. Admin reviews pending BYOI documents at `/admin/byoi`
2. Admin verifies:
   - Document is legible and complete
   - Policy information is accurate
   - Policy dates cover the rental period
   - Policy appears to meet minimum requirements
3. Admin can:
   - **Approve**: Document meets requirements, renter can proceed
   - **Reject**: Document is insufficient, admin must provide notes explaining rejection

### Step 4: Liability Acceptance (Required)

1. Once BYOI document is approved, renter must accept liability terms
2. Renter navigates to `/checkout/[bookingId]/liability`
3. Renter must:
   - Scroll through and read the liability acceptance text
   - Check the acceptance checkbox
   - Type their full name to confirm
4. System creates `liability_acceptances` record
5. Acceptance is stored with timestamp, IP address, and user agent for legal evidence

### Step 5: Checkout Validation

Before proceeding to payment, the system validates:

- BYOI document status = `'approved'`
- Liability acceptance exists for the booking
- All required information is complete

If validation fails, renter cannot proceed to payment.

## Liability Acceptance Terms

When choosing BYOI, renters must accept the following liability terms:

> "I understand that by declining the platform Protection Plan, I am relying on my own insurance policy. I accept full financial responsibility for any damages, losses, or claims not covered by my insurer, including vehicle damage, third-party liability, and administrative costs."

### What This Means

By accepting these terms, the renter acknowledges:

1. **Personal Insurance Reliance**: They are using their own insurance policy
2. **Full Financial Responsibility**: They are responsible for any costs not covered by their insurer
3. **Coverage Gaps**: Their insurance may not cover all damages or situations
4. **Administrative Costs**: They may be responsible for administrative fees and costs
5. **Third-Party Liability**: They are responsible for injuries or damages to third parties

## BYOI Approval Statuses

### Pending

- Document has been submitted
- Awaiting admin review
- Renter cannot proceed to payment
- Status displayed to renter with notification

### Approved

- Document meets requirements
- Admin has verified the policy
- Renter can proceed to liability acceptance and payment
- Status displayed with confirmation message

### Rejected

- Document does not meet requirements
- Admin has provided rejection notes
- Renter must resubmit or choose a platform Protection Plan
- Status displayed with rejection reason

## Common Rejection Reasons

BYOI documents may be rejected if:

- Document is illegible or incomplete
- Policy expiration date is before rental end date
- Policyholder name does not match renter's name
- Document does not show required coverage information
- Policy appears to be expired or inactive
- Document format is not acceptable (must be PDF, JPG, JPEG, or PNG)

## Resubmission Process

If a BYOI document is rejected:

1. Renter receives notification with admin notes explaining rejection
2. Renter can:
   - Upload a new document with corrected information
   - Choose a platform Protection Plan instead
3. New submission creates a new review cycle
4. Previous rejected documents are retained for audit purposes

## Storage and Security

### Document Storage

- BYOI documents are stored in Supabase Storage bucket: `byoi-docs`
- Files are organized by user ID: `{user_id}/byoi-{timestamp}.pdf`
- Access is restricted via Row-Level Security (RLS)

### Access Control

- **Renters**: Can read/write their own BYOI documents
- **Admins**: Can read all BYOI documents for review purposes
- **Dealers**: Cannot access BYOI documents (privacy protection)

### Data Retention

- BYOI documents are retained for the same duration as booking records
- Currently: 7 years per data retention policies
- Documents may be retained longer for legal or compliance purposes

## Compliance and Legal Evidence

### Stored Evidence

The system stores comprehensive evidence for compliance:

1. **BYOI Document**
   - Original file upload
   - Policy information
   - Submission timestamp
   - Approval/rejection status and notes

2. **Liability Acceptance**
   - Acceptance text version
   - Full acceptance text
   - Typed full name (evidence of explicit acceptance)
   - Acceptance timestamp
   - IP address (if available)
   - User agent string

3. **Booking Insurance Election**
   - Coverage type selection
   - Timestamp of selection
   - Link to BYOI document
   - Link to liability acceptance

### Audit Trail

All BYOI-related actions create an audit trail:

- Who submitted the document (user ID)
- When it was submitted (timestamp)
- Who reviewed it (admin ID, if applicable)
- When it was approved/rejected (timestamp)
- Why it was rejected (admin notes, if applicable)
- When liability was accepted (timestamp)

## Important Disclaimers

### Insurance Coverage Verification

- Carsera does not verify the specific terms of your insurance policy
- Carsera does not guarantee that your insurance will cover the rental
- It is the renter's responsibility to verify coverage with their insurer
- Some insurance policies may exclude peer-to-peer or commercial rentals

### Coverage Gaps

Renters should be aware that their personal insurance may not cover:

- Loss of use (dealer's lost rental income while vehicle is repaired)
- Diminution of value (reduction in vehicle value after damage)
- Administrative fees and processing costs
- Certain types of damage or incidents
- Commercial use or certain prohibited uses

### No Insurance Guarantee

- Carsera does not guarantee insurance coverage
- Carsera does not determine what your insurance will or will not cover
- Insurance coverage is determined by your insurance company
- You are responsible for all costs not covered by your insurance

## Comparison: BYOI vs. Protection Plans

### BYOI Advantages

- Use existing insurance policy
- No additional daily fee (beyond rental price)
- Familiar coverage terms (if you know your policy)

### BYOI Disadvantages

- Must have active personal insurance
- May have coverage gaps
- Must accept full personal liability
- Requires document upload and approval
- May not cover all types of damage or costs

### Protection Plan Advantages

- Specifically designed for rentals
- Clear coverage terms and deductibles
- No need to verify personal insurance
- May cover additional costs (loss of use, etc.)

### Protection Plan Disadvantages

- Additional daily fee
- Deductible applies to claims
- Terms may be different from personal insurance

## Contact and Support

### Questions About BYOI

If you have questions about BYOI:

- **General Questions**: [support@carsera.com](mailto:support@carsera.com)
- **Document Issues**: Contact support if you're having trouble uploading documents
- **Insurance Questions**: Contact your insurance company directly

### Insurance Verification

**Important:** Before choosing BYOI, contact your insurance company to verify:

- Does your policy cover rental vehicles?
- Does your policy cover peer-to-peer rentals?
- What are your coverage limits?
- What is your deductible?
- Are there any exclusions that might apply?

## Acceptance Acknowledgment

By choosing BYOI, you acknowledge that:

1. You have read and understand this BYOI documentation
2. You have verified with your insurance company that your policy covers this rental
3. You understand that you are relying on your own insurance
4. You accept full financial responsibility for costs not covered by your insurance
5. You understand that Carsera does not provide insurance or guarantee coverage
6. You have uploaded accurate and current insurance documentation
7. You will maintain active insurance coverage for the entire rental period

---

**Remember:** BYOI is a choice that requires careful consideration. If you're unsure about your insurance coverage, consider selecting a platform Protection Plan instead.

*This documentation is provided for informational purposes only and does not constitute legal or insurance advice. Consult with your insurance provider and legal counsel for specific questions about your coverage.*
