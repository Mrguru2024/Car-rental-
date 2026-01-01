# Risk Mitigation & Trust Automation Layer

This document describes the automated risk mitigation and trust automation layer added to the platform.

## Overview

The risk mitigation layer provides automated verification, compliance enforcement, fraud prevention, and trust automation without changing the existing UI or user flows.

## Architecture

### Folder Structure

```
lib/
├── verification/          # Automated verification rules and computation
│   ├── rules.ts          # Verification rule definitions
│   └── computeVerification.ts  # Main verification computation logic
├── compliance/           # Compliance enforcement
│   ├── listingGate.ts   # Listing activation enforcement
│   └── insurance.ts     # Insurance compliance checks
├── risk/                 # Fraud prevention
│   ├── rateLimit.ts     # Rate limiting for actions
│   └── bookingGuard.ts  # Booking fraud guardrails
└── images/               # Image fallback system
    ├── getVehicleDisplayImage.ts
    └── providers/
        └── vinaudit.ts
```

## Database Tables

### verification_states
Stores computed verification status for each user.

- `user_id` (UUID, unique) - References profiles.id
- `user_type` (text) - 'renter' | 'dealer' | 'private_host'
- `status` (text) - 'verified' | 'restricted' | 'rejected' | 'pending'
- `reasons` (JSONB) - Array of rule failure reasons
- `computed_at` (timestamptz) - Last computation time

### insurance_records
Tracks insurance compliance for hosts.

- `user_id` (UUID) - References profiles.id
- `policy_number` (text, nullable)
- `expires_on` (date, nullable)
- `status` (text) - 'valid' | 'expired' | 'missing'
- `document_url` (text, nullable)

### vehicle_image_map
Caches vehicle images from fallback providers.

- `vehicle_key_hash` (text, unique) - Hash of make/model/year
- `provider` (text) - 'vinaudit' | 'host_upload' | 'fallback'
- `image_urls` (JSONB) - Array of image URLs

### rate_limits
Tracks rate limiting for fraud prevention.

- `identifier` (text) - User ID or IP address
- `action_type` (text) - 'booking_attempt' | 'verification_submit' | 'listing_create'
- `count` (integer) - Number of attempts
- `window_start` (timestamptz) - Start of rate limit window

## Verification System

### Rules

The verification system uses a fail-closed approach:

1. **Required Documents** - Must be uploaded based on role
2. **Insurance** - Required for dealers and private hosts
3. **Phone Verification** - Must be verified
4. **Email Verification** - Must be verified
5. **Stripe Risk** - Must not be flagged as highest risk

### Status Computation

- **verified** - All rules pass
- **restricted** - Critical rules fail (documents, insurance)
- **pending** - Non-critical rules fail (can be fixed)
- **rejected** - Manual rejection (future use)

### Triggers

Verification is computed:
- On signup completion
- On document upload
- On insurance update
- Via nightly scheduled job (manual endpoint: `/api/verification/compute`)

## Compliance Enforcement

### Listing Activation

Listings can only be activated if:
- Host verification status is 'verified'
- Insurance is valid (for dealers/private hosts)

If requirements not met, listing status is forced to 'inactive' or 'paused'.

### Insurance Compliance

- Insurance records are checked on upload
- Expired insurance auto-pauses listings
- Nightly job checks for expired insurance

## Fraud Prevention

### Rate Limiting

Actions are rate-limited:
- Booking attempts: 10 per hour
- Verification submits: 5 per 24 hours
- Listing creates: 20 per hour

### Booking Guardrails

Before allowing a booking:
1. Renter must be verified
2. Rate limit check
3. Vehicle availability check
4. Overlapping booking check

### Stripe Radar

Metadata is added to Stripe Checkout sessions for fraud detection:
- userId
- vehicleId
- bookingId
- platform identifier

## Image Fallback System

Priority order:
1. Host-uploaded photos (Supabase Storage)
2. VinAudit API (cached)
3. Fallback silhouette (Unsplash)

Results are cached in `vehicle_image_map` to reduce API calls.

## SEO Enhancements

- Dynamic metadata generation for listing pages
- JSON-LD structured data for search engines
- Open Graph tags for social sharing

## Integration Points

### Existing Routes Enhanced

- `/api/bookings/create` - Added booking guardrails
- `/app/listings/[id]` - Added image fallback and SEO metadata
- Vehicle cards - Use image fallback system

### New Routes

- `/api/verification/compute` - Manual verification computation
  - POST: Compute for specific user
  - GET: Nightly job (requires secret token)

## Environment Variables

```env
VINAUDIT_API_KEY=your_vinaudit_api_key  # Optional, for image fallback
VERIFICATION_JOB_SECRET=your_secret     # For nightly job endpoint
```

## Scheduled Jobs

TODO: Set up Supabase scheduled function or external cron job to call:
```
GET /api/verification/compute
Authorization: Bearer {VERIFICATION_JOB_SECRET}
```

This will compute verification for all users nightly.

## Future Enhancements

- Stripe Radar integration for real-time risk assessment
- Advanced fraud detection patterns
- Automated document verification (OCR)
- Insurance marketplace integration
- Real-time compliance monitoring dashboard
