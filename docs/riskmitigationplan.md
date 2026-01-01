You are Cursor AI working in an existing Next.js (App Router) + Supabase + Stripe codebase.

NON-NEGOTIABLE CONSTRAINT:

- Do NOT change existing UI layouts, component structure, routes, or existing core functions.
- Do NOT rename files, routes, or database tables that already exist.
- Do NOT replace existing flows (auth, listings, booking, payments). Only ADD enhancements.
- If you must touch an existing file, use MINIMAL DIFF (surgical edits) and preserve behavior.
- If you are unsure, add a TODO and proceed with the enhancement layer in new files.

GOAL:
Add an “Automated Risk Mitigation + Trust Automation Layer” that enhances the platform WITHOUT changing current UX.

SCOPE:

1. Hybrid onboarding support (dealers + private hosts) via role expansion
2. Automated verification statuses (no human admin dependency)
3. Automated listing activation/pausing rules
4. Fraud guardrails (rate limits + booking checks + Stripe Radar usage)
5. Insurance + document compliance enforcement
6. Image fallback automation (host photos -> VinAudit fallback -> silhouette)
7. SEO enhancements remain unchanged in UI, only metadata/sitemaps/structured data additions

=====================================================
A) IMPLEMENTATION STRATEGY (ADD-ON ONLY)
=====================================================

- Create a new folder: /lib/risk/ (all logic added here)
- Create a new folder: /lib/verification/
- Create a new folder: /lib/compliance/
- Create a new folder: /lib/images/ (if not already present)
- Add server-side enforcement in NEW route handlers or wrappers.
- Add DB migrations ONLY if tables do not exist; never drop or rename existing tables.

=====================================================
B) DATABASE ADDITIONS (ONLY IF MISSING)
=====================================================

1. Add support for host types:

- Extend profiles.role to include: private_host (do NOT remove dealer/renter/admin)
- If profiles.role is enum, create migration to add value; if text, just support value.

2. Add automated verification table if missing:
   verification_states:

- id uuid pk
- user_id uuid references profiles.id unique
- user_type text (renter|dealer|private_host)
- status text (verified|restricted|rejected|pending)
- reasons jsonb (array of rule failures)
- computed_at timestamptz

3. Add insurance compliance fields if missing:

- store in documents table or create insurance_records table:
  insurance_records:
- id uuid pk
- user_id uuid references profiles.id
- policy_number text nullable
- expires_on date nullable
- status text (valid|expired|missing)
- updated_at timestamptz

4. Add vehicle_image_map if missing:
   vehicle_image_map:

- id uuid pk
- vehicle_key_hash text unique
- provider text
- image_urls jsonb
- updated_at timestamptz

NOTE: If any of these tables already exist under different names, DO NOT create duplicates.
Instead, map to the existing tables and document it in /docs/RISK_LAYER.md.

=====================================================
C) AUTOMATED RULE ENGINE (NO UI CHANGES)
=====================================================
Create a rule engine that computes verification automatically with “fail-closed” logic:

- If required docs missing => status = restricted
- If insurance expired => status = restricted and listings auto-paused
- If Stripe risk indicators high => booking blocked
- If phone/email not verified => restricted

Implement as:

- /lib/verification/rules.ts
- /lib/verification/computeVerification.ts

Expose a single function:
computeVerificationForUser(userId) -> {status, reasons}

Run this function:

- On signup completion
- On document upload
- Nightly scheduled job (use Supabase scheduled function if available; if not, create a manual endpoint + README TODO)

DO NOT add dashboards. This is automated.

=====================================================
D) LISTING ACTIVATION ENFORCEMENT (NO UI CHANGES)
=====================================================
Enforce on server-side create/update listing:

- If host not verified => listing status forced to “inactive” or “paused”
- If insurance missing/expired => listing status forced to “paused”
- If host verified => listing can become active

Implement:

- /lib/compliance/listingGate.ts
- Wrap existing listing create/update server handler with gating logic.
  DO NOT change listing forms; only adjust server response messages minimally.

=====================================================
E) BOOKING FRAUD GUARDRAILS (NO UI CHANGES)
=====================================================
Add server-side checks BEFORE creating Stripe Checkout:

1. renter verification status must be verified
2. rate limit booking attempts per user/IP
3. block overlap bookings (already required)
4. Stripe Radar: enable and set metadata tags (userId, listingId)

Implement:

- /lib/risk/rateLimit.ts (basic in-memory is OK for MVP; prefer Upstash/Redis only if already in stack)
- /lib/risk/bookingGuard.ts

Integrate by minimally wrapping:

- /api/stripe/checkout
- /api/bookings/create

UI must not change; show existing error state if one exists.

=====================================================
F) INSURANCE & DOCUMENT COMPLIANCE (AUTOMATED)
=====================================================

- Require proof of insurance for hosts (dealer + private_host)
- Parse expiration date from user input (do not attempt OCR)
- Auto-pause listings when expired

Implement:

- /lib/compliance/insurance.ts
- Trigger on:
  - insurance doc upload
  - nightly compliance check

=====================================================
G) IMAGE FALLBACK (NO UI CHANGES)
=====================================================
You MUST keep existing listing UI and only ensure images never break.

Rules:

1. Use host-uploaded photos from Supabase Storage (vehicle-photos bucket)
2. If none => call VinAudit image API adapter (fast option)
3. Cache results in vehicle_image_map
4. If provider fails => local silhouette

Implement:

- /lib/images/getVehicleDisplayImage.ts
- /lib/images/providers/vinaudit.ts (adapter)
- No UI refactor: only swap image src resolver function (or add one if absent)

=====================================================
H) SEO ENHANCEMENTS (NO UI CHANGES)
=====================================================

- Add generateMetadata() to listing pages if missing
- Add JSON-LD
