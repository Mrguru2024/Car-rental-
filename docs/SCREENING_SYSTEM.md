# Screening System Implementation

## Overview

The screening system provides MVR (Motor Vehicle Record) and soft credit checks for renters, using a free-now approach with mock providers and adapter patterns for future production integration.

## Architecture

### Database Tables

1. **policy_acceptances** - Generic policy acceptance tracking
2. **screening_consents** - Specific screening consent records
3. **renter_screenings** - Screening results and status
4. **adverse_actions** - Scaffold for compliance (FCRA adverse action notices)

See `supabase/migrations/021_add_screening_system.sql` for schema.

### Provider Adapter Layer

Located in `lib/screening/providers/`:

- **MockProvider** (FREE NOW) - Deterministic outcomes based on test patterns:
  - Email/ID contains "+fail" → FAIL
  - Email/ID contains "+conditional" → CONDITIONAL
  - Otherwise → PASS

- **CheckrProvider** (scaffold) - Ready for sandbox integration when env vars are configured

### Workflows

Located in `lib/screening/workflows.ts`:

- `runMvrScreening()` - Complete MVR screening workflow
- `runSoftCreditScreening()` - Soft credit screening workflow
- `getScreeningSummary()` - Get screening summary for a renter
- `hasPolicyAcceptance()` - Check if user accepted policy
- `recordPolicyAcceptance()` - Record policy acceptance

### API Routes

- `POST /api/screenings/mvr/request` - Request MVR screening
- `POST /api/screenings/soft-credit/request` - Request soft credit screening
- `GET /api/screenings/:id` - Get screening status
- `POST /api/screenings/policy/accept` - Accept policy/consent

### UI Components

- `TrustGateModal` - Policy consent modal
- `ScreeningStatusPill` - Status badge component
- `DealerRenterTrustPanel` - Dealer view of screening badges

## Integration Points (TODO)

### 1. Checkout Workflow Integration

**Location**: `app/checkout/[bookingId]/review/page.tsx` (or similar)

**Required changes**:

```typescript
// Before checkout, check for MVR screening
import { hasPolicyAcceptance, getScreeningSummary } from '@/lib/screening/workflows'
import TrustGateModal from '@/components/Screening/TrustGateModal'

// In the checkout page component:
const hasMvrConsent = await hasPolicyAcceptance(profileId, 'renter_mvr_consent_v1', '1.0')
const screeningSummary = await getScreeningSummary(profileId, bookingId)

// Show TrustGateModal if consent missing
// Block checkout if screening result is 'fail'
// Allow with restrictions if result is 'conditional'
```

**Gate logic**:
- PASS → Allow checkout
- CONDITIONAL → Allow with restrictions (deposit, vehicle tier limits)
- FAIL → Block checkout, show message

### 2. Dealer Booking View Integration

**Location**: `app/dealer/bookings/page.tsx` or booking detail pages

**Required changes**:

```typescript
import DealerRenterTrustPanel from '@/components/Screening/DealerRenterTrustPanel'
import { getScreeningSummary } from '@/lib/screening/workflows'

// For each booking, fetch screening summary
const screeningSummary = await getScreeningSummary(booking.renter_id, booking.id)

// Display in booking card/detail view
<DealerRenterTrustPanel
  renterId={booking.renter_id}
  bookingId={booking.id}
  screeningSummary={screeningSummary}
/>
```

### 3. Booking Creation Integration

**Location**: `app/api/bookings/create/route.ts`

**Optional enhancement** (can be done later):
- Auto-trigger MVR screening after booking creation
- Store screening_id on booking record

### 4. Admin Override Interface

**Location**: Create `app/admin/screenings/page.tsx`

**Features**:
- List all screenings
- View screening details
- Manual override capability (Prime Admin only for fail→pass)
- Audit log integration

## Policy Keys

- `renter_mvr_consent_v1` (version 1.0)
- `renter_soft_credit_consent_v1` (version 1.0)
- `screening_disclaimer_v1` (version 1.0) - Informational only

Policy content is in `lib/screening/policies.ts`.

## Testing

### Test User Patterns

Create test users with these email patterns:
- `test+fail@example.com` → Will fail screening
- `test+conditional@example.com` → Will get conditional result
- `test@example.com` → Will pass screening

### Manual Testing Checklist

- [ ] Policy acceptance modal displays correctly
- [ ] Cannot request screening without consent
- [ ] MVR screening workflow completes end-to-end
- [ ] Soft credit screening workflow completes end-to-end
- [ ] Screening results stored correctly
- [ ] Dealer can view screening badges (with booking context)
- [ ] Renter can view their own screening summaries
- [ ] Admin can view all screenings
- [ ] RLS policies enforce correct access control
- [ ] Audit logs recorded for screening events

## Security & Compliance

### RLS Policies

- Renters: Can view their own screening summaries
- Dealers: Can view screenings only for bookings on their vehicles
- Admins: Can view all screenings
- Server-only: Only service role can insert/update screenings

### Data Privacy

- IP addresses are hashed before storage
- Raw credit report data is NOT stored (only high-level signals)
- Provider references stored for audit trail
- Adverse action notices scaffolded for FCRA compliance

### Audit Logging

All screening events are logged via `logAuditEvent()`:
- `SCREENING_MVR_COMPLETED`
- `SCREENING_MVR_FAILED`
- `SCREENING_SOFT_CREDIT_COMPLETED`
- `SCREENING_SOFT_CREDIT_FAILED`

## Future Enhancements

1. **Checkr Integration**: Wire up CheckrProvider when ready for production
2. **Webhook Support**: Add webhook endpoints for async screening results
3. **Admin Override UI**: Build admin interface for manual overrides
4. **Conditional Restrictions**: Implement deposit/vehicle tier restrictions for conditional results
5. **Adverse Action Notices**: Complete adverse action workflow (email notices, FCRA compliance)
6. **Screening Caching**: Reuse screening results across bookings (with expiration)

## Environment Variables

For future Checkr integration:
- `CHECKR_API_KEY` - Checkr API key
- `CHECKR_BASE_URL` - Checkr API base URL (defaults to sandbox)
- `USE_CHECKR` - Set to 'true' to use Checkr instead of MockProvider

Currently, MockProvider is used by default (free-now build).

## Files Created

### Database
- `supabase/migrations/021_add_screening_system.sql`

### Core Logic
- `lib/screening/providers/types.ts`
- `lib/screening/providers/MockProvider.ts`
- `lib/screening/providers/CheckrProvider.ts`
- `lib/screening/providers/index.ts`
- `lib/screening/workflows.ts`
- `lib/screening/policies.ts`

### API Routes
- `app/api/screenings/mvr/request/route.ts`
- `app/api/screenings/soft-credit/request/route.ts`
- `app/api/screenings/[id]/route.ts`
- `app/api/screenings/policy/accept/route.ts`

### UI Components
- `components/Screening/TrustGateModal/index.tsx`
- `components/Screening/ScreeningStatusPill/index.tsx`
- `components/Screening/DealerRenterTrustPanel/index.tsx`

## Notes

- This system does NOT overlap with existing verification/document systems
- Uses existing audit logging infrastructure
- Reuses existing policy acceptance pattern (extended for screening)
- All screening data is stored separately from verification_status
- Free-now build uses MockProvider (deterministic test outcomes)
- Provider adapter pattern allows easy swap to Checkr when ready
