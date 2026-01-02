# Liability Acceptance Documentation

## Overview

This document outlines the liability acceptance workflow for renters who choose to Bring Their Own Insurance (BYOI) instead of selecting a platform Protection Plan.

## Purpose

When a renter chooses BYOI coverage, they must explicitly accept liability terms acknowledging that:

1. They are relying on their own insurance policy
2. They accept full financial responsibility for any damages, losses, or claims not covered by their insurer
3. This responsibility includes vehicle damage, third-party liability, and administrative costs

This acceptance serves as legal evidence that the renter was informed of and agreed to these terms before completing their booking.

## Acceptance Text

The exact liability acceptance text (version `v1`) is:

```
I understand that by declining the platform Protection Plan, I am relying on my own insurance policy. I accept full financial responsibility for any damages, losses, or claims not covered by my insurer, including vehicle damage, third-party liability, and administrative costs.
```

**Important**: This text must be stored exactly as shown in the `liability_acceptances.acceptance_text` field.

## Workflow

### When Liability Acceptance is Required

Liability acceptance is **only required** when:
- The booking's `coverage_type = 'byoi'`
- The BYOI document has been approved (`byoi_documents.status = 'approved'`)
- No liability acceptance record exists for the booking

### Acceptance Process

1. **Route**: `/checkout/[bookingId]/liability`
2. **Prerequisites**:
   - Booking exists and belongs to renter
   - `coverage_type = 'byoi'`
   - BYOI document is approved
3. **UI Steps**:
   - Display scrollable acceptance text container
   - Require user to scroll to bottom (scroll detection)
   - Display acceptance checkbox (disabled until scrolled)
   - Display full name input field (disabled until checkbox checked)
   - User types their full name (must match profile full name)
   - Submit button (disabled until all conditions met)
4. **Submission**:
   - Creates `liability_acceptances` record
   - Stores acceptance text, typed name, timestamp, IP, user agent
   - Redirects to review page

### UI Requirements

#### Scroll-to-Read Pattern

- Acceptance text displayed in scrollable container (max-height: 256px)
- Scroll detection: When user scrolls to bottom (within 10px), enable checkbox
- Visual indicator: Show message "Please scroll to the bottom to continue" until scrolled
- Checkbox remains disabled until scroll detected

#### Acceptance Checkbox

- Label: "I have read and understand the liability acceptance terms above"
- Disabled until scroll completed
- Required for submission

#### Typed Full Name

- Label displays: "Type your full name to confirm acceptance: [Profile Full Name]"
- Input field disabled until checkbox checked
- Validation: Typed name must match profile full name (case-insensitive, trimmed)
- Required for submission

#### Submit Button

- Disabled until:
  - Scroll completed
  - Checkbox checked
  - Full name typed and validated
- Text: "Accept and Continue"
- On success: Creates acceptance record and redirects to review page

## Stored Data

### liability_acceptances Table

Each liability acceptance record stores:

- `booking_id`: Reference to the booking (UNIQUE constraint)
- `user_id`: Reference to the renter's profile
- `acceptance_text_version`: Version identifier (currently `'v1'`)
- `acceptance_text`: Full acceptance text (exact copy)
- `typed_full_name`: The name the user typed (evidence of explicit acceptance)
- `accepted_at`: Timestamp of acceptance (auto-generated)
- `ip_address`: IP address of user (nullable, captured if available)
- `user_agent`: User agent string (nullable, captured if available)

### Compliance Purpose

This data serves as legal evidence that:

1. The renter was presented with the liability terms
2. The renter scrolled through and read the terms
3. The renter explicitly checked a box acknowledging understanding
4. The renter typed their full name as confirmation
5. The acceptance occurred at a specific timestamp
6. The acceptance can be associated with a specific IP/user agent

## Access Control

### RLS Policies

- **Renters**: Can create and read their own liability acceptances
- **Admins**: Can read all liability acceptances (for compliance/audit)

### Business Rules

- One acceptance per booking (UNIQUE constraint on `booking_id`)
- Cannot update or delete acceptances (append-only for compliance)
- Acceptance is linked to booking, not reusable across bookings

## Integration with Checkout

### Validation Points

1. **Liability Acceptance Page**
   - Checks if acceptance already exists
   - If exists, shows confirmation message
   - If not, displays acceptance form

2. **Review Page**
   - For BYOI bookings, verifies acceptance exists
   - If missing, redirects to liability acceptance page

3. **Stripe Checkout API**
   - For BYOI bookings, verifies:
     - BYOI document status = `'approved'`
     - Liability acceptance exists
   - If either missing, returns error

4. **Booking Confirmation**
   - Booking cannot be confirmed without valid liability acceptance (for BYOI)

## Legal Considerations

### Evidence Trail

The liability acceptance system creates a comprehensive evidence trail:

- **Timestamp**: Exact time of acceptance
- **Text**: Exact terms presented
- **Action**: Explicit checkbox and typed name
- **Identity**: Full name typed by user
- **Context**: Associated with specific booking and coverage election

### Retention

Liability acceptances should be retained for the same duration as booking records (currently 7 years per data retention policies).

### Audit Trail

All acceptances are stored with:
- User ID (who accepted)
- Booking ID (what booking)
- Timestamp (when)
- IP address (where, if available)
- User agent (device/browser, if available)

This creates an audit trail suitable for legal and compliance purposes.

## Error Handling

### Common Scenarios

1. **Acceptance Already Exists**
   - Show confirmation message
   - Provide link to continue to review page
   - Do not allow re-acceptance

2. **Name Mismatch**
   - Show error: "The name must match your profile name"
   - Keep form data, allow retry

3. **Validation Failures**
   - Show specific error messages
   - Prevent submission until all requirements met

## Future Enhancements

Potential post-MVP enhancements:

- Acceptance text versioning (support multiple versions)
- PDF generation of acceptance documents
- Email confirmation of acceptance
- Acceptance history view for renters
- Enhanced audit logging