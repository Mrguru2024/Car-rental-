# Disputes System Implementation

## Overview

The disputes system provides renter-facing dispute resolution for booking issues (vehicle damage, late returns, cleaning fees, etc.). This is **separate** from the claims system (claims = insurance/accidents, disputes = booking issues).

## Architecture

### Database Tables

All tables created in `supabase/migrations/022_add_disputes_system.sql`:

1. **disputes** - Main dispute records
   - Categories: vehicle_damage, late_return, cleaning_fee, mechanical_issue, safety_concern, billing_issue, other
   - Statuses: open, awaiting_response, under_review, resolved, escalated, closed

2. **dispute_messages** - Message thread between parties
   - Supports renter, dealer, and admin messages

3. **dispute_evidence** - Evidence file metadata
   - Stores file paths (files stored in `dispute-evidence` storage bucket)

4. **dispute_decisions** - Immutable decision history
   - Records all admin decisions (no deletion/updates)

### Storage Bucket

**Note**: The `dispute-evidence` storage bucket must be created manually in Supabase dashboard.

Bucket setup:
- **Name**: `dispute-evidence`
- **Public**: No (private)
- **File size limit**: 50 MB (adjust as needed)
- **Allowed MIME types**: `application/pdf,image/jpeg,image/png,image/jpg`

Storage policies (create in Supabase dashboard):
- Users can upload/read files for disputes they're party to
- Admins can read all files
- Files stored in path: `{user_id}/disputes/{dispute_id}/{timestamp}-{index}.{ext}`

### Workflow Utilities

Located in `lib/disputes/`:

- **transitions.ts** - Status transition validation
- **workflows.ts** - Business logic (booking eligibility, dealer response window)

### API Routes

#### Renter/Dealer Endpoints

- `POST /api/disputes` - Create dispute
- `GET /api/disputes` - List disputes (filtered by role)
- `GET /api/disputes/:id` - Get dispute details
- `POST /api/disputes/:id/messages` - Add message
- `POST /api/disputes/:id/evidence/sign` - Get upload paths (client-side upload pattern)

#### Admin Endpoints

- `POST /api/admin/disputes/:id/decision` - Admin decision
  - Decisions: no_action, partial_refund, full_refund, fee_waived, escalate_to_coverage, close
  - Updates status and creates immutable decision record

- `POST /api/prime-admin/disputes/:id/decision` - Prime admin override
  - Decisions: reverse, flag, lock, close
  - Preserves all previous decisions (append-only)

## Status Transitions

### Valid Transitions

- `open` → `awaiting_response`, `under_review`, `resolved`, `escalated`, `closed`
- `awaiting_response` → `under_review`, `resolved`, `escalated`, `closed`
- `under_review` → `resolved`, `escalated`, `closed`
- `resolved` → `closed`
- `escalated` → `resolved`, `closed`
- `closed` → `closed` (only prime admin can reopen)

### Decision → Status Mapping

- `no_action` → `resolved`
- `partial_refund` → `resolved`
- `full_refund` → `resolved`
- `fee_waived` → `resolved`
- `escalate_to_coverage` → `escalated`
- `close` → `closed`
- `reverse` (prime admin) → `resolved`
- `flag` (prime admin) → `under_review`
- `lock` (prime admin) → `closed`

## Auto-Transitions

### Dealer Response Window

If dealer hasn't responded within 48 hours:
- Status auto-transitions: `open`/`awaiting_response` → `under_review`
- Implemented as lazy evaluation (checked on dispute access)
- Audit logged

## RLS Policies

### Disputes
- Renters: Can create/view disputes for their own bookings
- Dealers: Can view disputes for bookings on their vehicles
- Admins: Can view/update all disputes

### Messages
- Parties (renter/dealer) can view/add messages (when status != closed)
- Admins can view/add messages

### Evidence
- Parties can upload/view evidence (when status != closed)
- Admins can upload/view all evidence
- File paths stored, actual files in private storage bucket

### Decisions
- Parties and admins can view decisions
- Only admins can create decisions (enforced at API level)

## Integration Points (TODO)

### 1. Renter Dispute Creation UI

**Location**: Booking detail pages (e.g., `/renter/bookings/[id]`)

**Required**:
- "Report an Issue" button
- Stepper form:
  1. Choose category
  2. Summary textarea
  3. Evidence upload
  4. Submit
- Show "What happens next" timeline after submission

### 2. Dispute Detail Page

**Location**: `/disputes/:id`

**Features**:
- Status header (plain English)
- Timeline (messages, status changes, decisions)
- Messages thread
- Evidence gallery (with signed URLs)
- Decision panel (read-only for parties)
- Add message form (if status != closed)
- Upload evidence (if status != closed)

### 3. Admin Dispute Queue

**Location**: `/admin/disputes` (new page)

**Features**:
- List all disputes with filters (status, category, date)
- Detail view with:
  - Booking snapshot
  - Parties info
  - Evidence gallery
  - Decision form (requires notes)
- Prime Admin override controls (if role)

### 4. Dealer Response UI

**Location**: Booking detail pages or dealer dashboard

**Features**:
- Show disputes for bookings
- Quick response form
- View dispute details

## Audit Logging

All sensitive actions are logged via `logAuditEvent()`:

- `DISPUTE_CREATED`
- `DISPUTE_MESSAGE_ADDED`
- `DISPUTE_DECISION`
- `DISPUTE_PRIME_ADMIN_OVERRIDE`
- `DISPUTE_AUTO_TRANSITION`

## Security & Compliance

### Neutral Language

All UI and documentation must use neutral language:
- "reported", "documented", "reviewed", "resolved via platform rules"
- No legal fault determination
- Clear disclaimers on all dispute pages

### Required Disclaimers

Every dispute page must include:
- "Carsera facilitates dispute documentation and platform policy resolution but does not determine legal fault or liability."

If escalated:
- "This matter is being handled via coverage or third-party process. Updates will be provided."

### Data Privacy

- Evidence files stored in private bucket
- Only signed URLs exposed to authorized users
- RLS policies enforce access control
- IP addresses logged for audit (not exposed to users)

## Files Created

### Database
- `supabase/migrations/022_add_disputes_system.sql`

### Core Logic
- `lib/disputes/transitions.ts`
- `lib/disputes/workflows.ts`

### API Routes
- `app/api/disputes/route.ts`
- `app/api/disputes/[id]/route.ts`
- `app/api/disputes/[id]/messages/route.ts`
- `app/api/disputes/[id]/evidence/sign/route.ts`
- `app/api/admin/disputes/[id]/decision/route.ts`
- `app/api/prime-admin/disputes/[id]/decision/route.ts`

## Testing Checklist

- [ ] Renter can create dispute for eligible booking
- [ ] Cannot create dispute for ineligible booking (wrong status, wrong renter)
- [ ] Dealer can view disputes for their vehicle bookings
- [ ] Parties can add messages (when status != closed)
- [ ] Evidence upload paths are generated correctly
- [ ] Admin decisions create decision records and update status
- [ ] Prime admin overrides preserve previous decisions
- [ ] Auto-transition works after 48 hours (lazy evaluation)
- [ ] RLS policies enforce correct access
- [ ] Audit logs recorded for all actions
- [ ] Non-parties cannot access disputes

## Notes

- Disputes are **separate** from claims (claims = insurance/accidents)
- Reuses existing audit logging infrastructure
- Follows existing admin approval patterns (BYOI/verifications)
- Client-side upload pattern (like existing codebase)
- All decisions are immutable (append-only history)
- Prime admin can override without deleting history

## Next Steps

1. Create storage bucket `dispute-evidence` in Supabase dashboard
2. Configure storage policies (see setup instructions)
3. Build UI components (dispute creation, detail page, admin queue)
4. Integrate into booking pages and admin dashboard
5. Add notification system integration (if exists)
6. Test end-to-end workflows
