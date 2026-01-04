# Dealer Complaints & Renter Reviews System

## Overview

This system adds:
1. **Dealer Complaints** - Dealers can report issues with renters (separate from renter disputes)
2. **Dealer→Renter Reviews** - Dealers can review renters after completed bookings (visible to other dealers)
3. **Policy Acceptance System** - Mandatory warning/protection modals with click-to-accept evidence

## Architecture

### Database Tables

All tables created in `supabase/migrations/023_add_dealer_complaints_reviews_system.sql`:

1. **dealer_complaints** - Dealer complaint records
   - Categories: late_return, cleaning_fee, damage, unauthorized_driver, fraud, threatening_behavior, other
   - Statuses: draft, submitted, under_review, resolved, escalated, closed

2. **complaint_messages** - Message thread for complaints
3. **complaint_evidence** - Evidence file metadata (files in `complaint-evidence` bucket)
4. **renter_reviews** - Dealer→renter reviews (1 per booking, visible to dealers)

5. **policy_acceptances** (extended) - Added context_type, context_id, role fields

### Storage Buckets

**Note**: The `complaint-evidence` storage bucket must be created manually in Supabase dashboard.

- **Name**: `complaint-evidence`
- **Public**: No (private)
- **File size limit**: 50 MB
- **Allowed MIME types**: `application/pdf,image/jpeg,image/png,image/jpg`

### Policy System

Policies defined in `lib/policies/content.ts`:

**Renter Policies:**
- `insurance_election_disclaimer` - Before checkout
- `byoi_liability_acceptance` - Before BYOI checkout
- `platform_rules_renter` - Before checkout / first booking
- `recall_badge_disclaimer` - Vehicle detail page (first time per user)

**Dealer Policies:**
- `dealer_listing_accuracy_terms` - Before publishing listing
- `dealer_complaint_terms` - Before submitting complaint
- `review_honesty_policy` - Before submitting renter review
- `no_confrontation_policy` - Before complaint submit and in dealer dashboard

## API Routes

### Dealer Complaints

- `POST /api/dealer/complaints` - Create complaint (draft status)
- `GET /api/dealer/complaints` - List complaints (filtered by role)
- `GET /api/dealer/complaints/:id` - Get complaint details
- `POST /api/dealer/complaints/:id/submit` - Submit complaint (requires policy acceptance)
- `POST /api/dealer/complaints/:id/messages` - Add message
- `POST /api/dealer/complaints/:id/evidence/sign` - Get upload paths

### Admin Complaint Management

- `POST /api/admin/complaints/:id/status` - Update complaint status
  - Statuses: under_review, resolved, escalated, closed
  - Notes required for resolved/closed

- `POST /api/prime-admin/complaints/:id/decision` - Prime admin override
  - Decisions: reverse, flag, lock, close
  - Notes required

### Dealer→Renter Reviews

- `POST /api/dealer/renter-reviews` - Create review
  - Requires: booking_id, renter_id, rating (1-5)
  - Optional: tags (array), comment (max 500 chars)
  - Requires policy acceptance: `review_honesty_policy`
  - Only one review per booking

- `GET /api/dealer/renter-reviews?renter_id=...` - Get reviews for renter
  - Visible to dealers and admins
  - Renters can view their own reviews

- `GET /api/dealer/renters/:renterId/trust-profile` - Get renter trust profile
  - Returns: avgRating, reviewCount, tagsSummary, complaintCount, advisory, verifiedIdentity
  - No PII exposed

### Policy Acceptance

- `POST /api/policies/accept` - Accept policy
  - Body: policy_key, policy_version, context_type (optional), context_id (optional), role (optional)

## Trust Profile

The trust profile provides dealers with renter information (no PII):

- **avgRating**: Average rating from dealer reviews (1-5)
- **reviewCount**: Total number of reviews
- **tagsSummary**: Array of {tag, count} sorted by frequency
- **complaintCount**: Number of complaints (submitted, under_review, resolved)
- **advisory**: 'none' | 'watchlisted' | 'restricted'
  - Watchlisted: >2 complaints OR avgRating < 2.5 with >3 reviews
  - Restricted: Set manually by admin (future enhancement)
- **verifiedIdentity**: Boolean (verification_status === 'approved')

## RLS Policies

### Dealer Complaints
- Dealers: Can create/view complaints for their bookings
- Renters: Can view complaints about them and add messages
- Admins: Can view/update all complaints

### Complaint Messages
- Parties (dealer/renter) can view/add messages
- Admins can view/add messages

### Complaint Evidence
- Parties can upload/view evidence
- Admins can view all evidence
- Files stored in private bucket

### Renter Reviews
- Dealers: Can create/view all renter reviews
- Renters: Can view their own reviews
- Admins: Can view all reviews

## Integration Points (TODO)

### 1. Dealer Booking Page (Pre-Approval)

**Location**: Booking request/detail pages

**Required**:
- Add "Renter Trust" panel showing:
  - Avg rating + review count
  - Top tags
  - Complaint summary
  - Advisory label
  - "View details" button (modal)

### 2. Dealer Complaint Flow

**Location**: Booking detail pages

**Required**:
- "Report Renter Issue" button
- Stepper form:
  1. Choose category
  2. Summary textarea
  3. Upload evidence
  4. Preview + accept `dealer_complaint_terms` policy
  5. Submit (changes status draft→submitted)
- Timeline view showing status progression

### 3. Dealer Review Flow

**Location**: After booking completion

**Required**:
- Review form with:
  1. Stars (rating 1-5)
  2. Tags (checkboxes or multi-select)
  3. Optional comment (max 500 chars, with character counter)
  4. Accept `review_honesty_policy` policy
  5. Submit

### 4. Policy Modal Component

**Location**: Reusable component

**Required**:
- `PolicyModal` component
- Displays policy title and content
- Checkbox "I understand"
- "Accept & Continue" button
- Calls `/api/policies/accept` on accept
- Blocks action until accepted

### 5. Admin Complaint Queue

**Location**: `/admin/complaints` (new page or extend existing admin UI)

**Required**:
- List all complaints with filters (status, category, date)
- Detail view with:
  - Booking snapshot
  - Parties info
  - Evidence gallery (signed URLs)
  - Status change form (requires notes for resolved/closed)
- Prime Admin override controls (if role)

## Policy Tags for Reviews

Suggested tags (stored as JSONB array):
- `on_time_return`
- `late_return`
- `clean_return`
- `messy_return`
- `good_communication`
- `poor_communication`
- `respectful`
- `disrespectful`
- `vehicle_care`
- `vehicle_abuse`
- `authorized_driver_only`
- `unauthorized_driver`
- `no_issues`
- `minor_issues`
- `major_issues`

## Safety & Moderation

- Comment length enforced (max 500 chars)
- Basic keyword filtering recommended (future enhancement)
- No PII in trust profiles (no addresses, license images, phone/email)
- "Report review" flow for renters (optional, future enhancement)

## Audit Logging

All sensitive actions logged via `logAuditEvent()`:

- `COMPLAINT_CREATED`
- `COMPLAINT_SUBMITTED`
- `COMPLAINT_MESSAGE_ADDED`
- `COMPLAINT_STATUS_UPDATED`
- `COMPLAINT_PRIME_ADMIN_OVERRIDE`
- `RENTER_REVIEW_CREATED`
- `POLICY_ACCEPTED`

## Files Created

### Database
- `supabase/migrations/023_add_dealer_complaints_reviews_system.sql`

### Core Logic
- `lib/policies/content.ts` - Policy definitions
- `lib/policies/acceptance.ts` - Policy acceptance helpers (with context support)

### API Routes
- `app/api/dealer/complaints/route.ts`
- `app/api/dealer/complaints/[id]/submit/route.ts`
- `app/api/dealer/complaints/[id]/messages/route.ts`
- `app/api/dealer/complaints/[id]/evidence/sign/route.ts`
- `app/api/dealer/complaints/[id]/route.ts`
- `app/api/admin/complaints/[id]/status/route.ts`
- `app/api/prime-admin/complaints/[id]/decision/route.ts`
- `app/api/dealer/renter-reviews/route.ts`
- `app/api/dealer/renters/[renterId]/trust-profile/route.ts`
- `app/api/policies/accept/route.ts`

## Testing Checklist

- [ ] Dealer can create complaint for their booking
- [ ] Cannot create complaint for ineligible booking (wrong status, wrong dealer)
- [ ] Complaint submission requires policy acceptance
- [ ] Renter can view complaints about them
- [ ] Parties can add messages to complaints
- [ ] Evidence upload paths generated correctly
- [ ] Admin can update complaint status (notes required for resolved/closed)
- [ ] Prime admin can override complaints
- [ ] Dealer can create review after completed booking
- [ ] Only one review per booking allowed
- [ ] Review creation requires policy acceptance
- [ ] Comment length enforced (max 500 chars)
- [ ] Dealers can view renter trust profiles
- [ ] Trust profile contains no PII
- [ ] Renters can view their own reviews
- [ ] Policy acceptance blocks actions until accepted
- [ ] RLS policies enforce correct access
- [ ] Audit logs recorded for all actions

## Notes

- Dealer complaints are **separate** from renter disputes (different tables, different workflows)
- Renter reviews are **separate** from renter→dealer/vehicle reviews (different table)
- Policy acceptances extended with context support (reuses existing table)
- Trust profiles contain NO PII (privacy-focused)
- All policies stored with context for audit trail
- Client-side upload pattern (like existing codebase)
- Prime admin can override without deleting history

## Next Steps

1. Create storage bucket `complaint-evidence` in Supabase dashboard
2. Configure storage policies (see setup instructions)
3. Build UI components (PolicyModal, complaint forms, review forms, trust profile panel)
4. Integrate into dealer booking pages and admin dashboard
5. Add policy modals to required flows (checkout, listing publish, etc.)
6. Test end-to-end workflows
