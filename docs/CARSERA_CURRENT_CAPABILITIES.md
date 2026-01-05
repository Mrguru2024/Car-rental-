# Carsera — Current Capabilities & Value Proposition

**Document Version:** 1.0  
**Last Updated:** Based on codebase audit as of current date  
**Purpose:** Factual representation of implemented features without speculation

---

## 1. What Carsera Is (Current State)

Carsera is a peer-to-peer car rental marketplace platform built on Next.js 16, TypeScript, Supabase (PostgreSQL), and Stripe. The platform enables vehicle owners (dealers and private hosts) to list vehicles for rent, and verified renters to book those vehicles. The system enforces verification requirements, manages payments through Stripe Connect, provides insurance election options, and includes administrative controls for platform governance. All core booking, payment, and user management functionality is operational.

---

## 2. Problems Carsera Currently Solves

### For Vehicle Owners (Dealers/Private Hosts)
- **Listing Management**: Create, edit, and manage vehicle listings with photo uploads, pricing, and availability
- **Payment Processing**: Automated payment collection and payouts via Stripe Connect (Express accounts)
- **Booking Management**: View and manage booking requests, confirmations, and completions
- **Trust Assessment**: Access renter trust profiles showing ratings, reviews, and complaint history before approving bookings
- **Complaint System**: Report issues with renters through structured complaint workflow with evidence upload
- **Renter Reviews**: Submit reviews about renters after completed bookings (visible to other dealers)

### For Renters
- **Vehicle Discovery**: Browse and search available vehicles with filtering by location, price, and dates
- **Booking System**: Create bookings with date selection, price calculation, and availability checking
- **Verification**: Submit identity verification documents for platform approval (required before booking)
- **Insurance Options**: Choose between platform protection plans (Basic, Standard, Premium) or Bring Your Own Insurance (BYOI) with document upload
- **Dispute Resolution**: Open disputes for booking-related issues (vehicle damage, late returns, cleaning fees, etc.)
- **Saved Vehicles**: Save favorite vehicles for later booking
- **Support Chat**: Real-time chat support for authenticated users (email option for guests)

### For Platform Administrators
- **User Management**: View, suspend, unsuspend, and troubleshoot user accounts across all roles
- **Verification Review**: Approve or reject user verification submissions with document audit trail
- **Security Monitoring**: Real-time security event tracking, audit logs, and incident resolution
- **Dispute Management**: Review and resolve disputes with decision tracking and audit logging
- **Complaint Management**: Review dealer complaints against renters, update status, and track resolution
- **BYOI Approval**: Review and approve/reject Bring Your Own Insurance documents
- **Blog Management**: Create, edit, and publish blog posts with AI-powered content suggestions (OpenAI integration)
- **Support Chat Management**: Access all support conversations for customer service

---

## 3. Implemented Capabilities

### Core Booking System
**Status:** ✅ Fully Implemented  
**Evidence:** `app/api/bookings/create/route.ts`, `bookings` table schema  
**Details:**
- Booking creation with date validation and availability checking
- Status workflow: draft → pending_payment → confirmed → completed/canceled
- Automatic price calculation (daily rate × days + 10% platform fee)
- Overlapping booking prevention
- Rate limiting and fraud guardrails via `lib/risk/bookingGuard.ts`
- Requires renter verification approval before booking

### Payment Processing (Stripe)
**Status:** ✅ Fully Implemented  
**Evidence:** `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/stripe/connect/onboard/route.ts`  
**Details:**
- Stripe Checkout integration for payment collection
- Stripe Connect Express accounts for dealer payouts
- Automated fee calculation (10% platform fee, dealer receives remainder)
- Webhook handling for payment confirmation and transfer tracking
- Payout status tracking (pending → transferred → paid_out)
- Dealer onboarding flow for Connect account setup

### User Verification System
**Status:** ✅ Fully Implemented  
**Evidence:** `app/api/verification/compute/route.ts`, `verification_states` table, `document_verification_audits` table  
**Details:**
- Document upload and storage (Supabase Storage)
- Verification status workflow: pending → approved/rejected
- Automated verification computation based on document analysis rules
- Admin review interface for manual approval/rejection
- Audit trail of all verification decisions
- Required before booking creation

### Insurance & Liability System
**Status:** ✅ Fully Implemented  
**Evidence:** `protection_plans` table, `booking_insurance_elections` table, `byoi_documents` table, `liability_acceptances` table  
**Details:**
- Three platform protection plans (Basic, Standard, Premium) with fee calculation
- Bring Your Own Insurance (BYOI) option with document upload
- BYOI document review and approval workflow
- Liability acceptance required for BYOI bookings
- Insurance election stored with each booking
- Policy acceptance tracking via `policy_acceptances` table

### Vehicle Listing System
**Status:** ✅ Fully Implemented  
**Evidence:** `vehicles` table, `vehicle_photos` table, `app/dealer/vehicles/new/VehicleFormClient.tsx`  
**Details:**
- Vehicle creation with make, model, year, VIN, pricing, location, description
- Photo upload to Supabase Storage (multiple photos per vehicle)
- VIN lookup integration (Auto.dev API) for auto-filling vehicle details
- Image fallback system (uploaded photos → VinAudit API → Unsplash fallback)
- Vehicle status management (active/inactive)
- Mileage limit configuration
- Vehicle tier system (tier1-4 based on year: 2010-2014, 2015-2019, 2020-2023, 2024+)
- Title type tracking (clean, rebuilt, salvage, flood, other) with platform rules
- Inspection status tracking (pending, passed, failed)

### Vehicle Tier & Compliance System
**Status:** ✅ Fully Implemented  
**Evidence:** `supabase/migrations/025_add_vehicle_tier_system.sql`, `lib/vehicle-tiers.ts`, `app/api/vehicles/validate/route.ts`  
**Details:**
- Automatic tier computation based on vehicle year (database trigger)
- Platform minimum year enforcement (2010+) via database constraint
- Title type validation (no salvage/flood/rebuilt allowed) via database constraint
- Vehicle listing validation API endpoint
- Dealer rental policies table with configurable requirements
- Booking eligibility API endpoint checking tier requirements, dealer policies, renter standing, and screening status

### Screening System
**Status:** 🟡 Partially Implemented (Mock Provider Active)  
**Evidence:** `lib/screening/providers/MockProvider.ts`, `lib/screening/providers/CheckrProvider.ts`, `screenings` table  
**Details:**
- MVR (Motor Vehicle Record) screening request workflow
- Soft Credit screening request workflow
- Screening consent collection and policy acceptance
- Screening status tracking (pending, in_progress, completed, failed)
- Mock provider fully functional for testing (deterministic outcomes)
- Checkr provider scaffolded but not implemented (requires CHECKR_API_KEY)
- Screening results stored in database with risk levels and signals

### Dispute Resolution System
**Status:** ✅ Fully Implemented  
**Evidence:** `disputes` table, `dispute_messages` table, `dispute_evidence` table, `app/api/disputes/route.ts`  
**Details:**
- Dispute creation by renters for booking issues (vehicle damage, late returns, cleaning fees, etc.)
- Dispute status workflow: open → awaiting_response → under_review → resolved/escalated/closed
- Message thread system for dispute communication
- Evidence file upload (Supabase Storage)
- Admin dispute management with decision tracking
- Prime Admin override capabilities with audit logging
- Status transition validation via `lib/disputes/transitions.ts`

### Dealer Complaint System
**Status:** ✅ Fully Implemented  
**Evidence:** `dealer_complaints` table, `complaint_messages` table, `app/api/dealer/complaints/route.ts`  
**Details:**
- Complaint creation by dealers against renters (late return, cleaning fee, damage, etc.)
- Draft → submitted workflow with policy acceptance requirement
- Message thread for complaint communication
- Evidence file upload
- Admin review and status management
- Prime Admin decision override with audit trail

### Renter Review System (Dealer → Renter)
**Status:** ✅ Fully Implemented  
**Evidence:** `renter_reviews` table, `app/api/dealer/renter-reviews/route.ts`  
**Details:**
- One review per booking (dealer reviews renter)
- Rating system (1-5 stars)
- Tag system (JSONB array of descriptive tags)
- Optional comment field (max 500 characters)
- Policy acceptance required (review honesty policy)
- Reviews visible to all dealers (not public)
- Trust profile computation based on reviews

### Renter Trust Profile
**Status:** ✅ Fully Implemented  
**Evidence:** `app/api/dealer/renters/[renterId]/trust-profile/route.ts`  
**Details:**
- Average rating calculation from dealer reviews
- Review count and tag summary
- Complaint count (submitted, under_review, resolved)
- Advisory status (none, watchlisted, restricted)
- Watchlisted logic: >2 complaints OR avgRating < 2.5 with >3 reviews
- Verification status indicator
- Accessible to dealers and admins only

### Vehicle Recall & Standing System
**Status:** ✅ Fully Implemented  
**Evidence:** `vehicle_recall_cache` table, `vehicle_standing` table, `lib/api/nhtsa.ts`  
**Details:**
- NHTSA recall lookup integration (free public API)
- Recall cache system to reduce API calls
- Recall badge display (green/yellow/red based on severity)
- Vehicle standing score computation (0-100) based on recalls, photos, dealer verification
- Standing grade (A-F) display
- Automatic cache expiration and refresh

### Policy Acceptance System
**Status:** ✅ Fully Implemented  
**Evidence:** `policy_acceptances` table, `lib/policies/content.ts`, `app/api/policies/accept/route.ts`  
**Details:**
- Policy definitions stored in codebase
- Policy acceptance tracking with context (vehicle, booking, etc.)
- Required acceptances for: insurance election, BYOI liability, listing accuracy, complaint submission, review submission, screening consent
- Policy versioning support
- Audit trail of all acceptances

### Security & Audit System
**Status:** ✅ Fully Implemented  
**Evidence:** `audit_logs` table, `security_events` table, `lib/security/auditLog.ts`  
**Details:**
- Comprehensive audit logging for all admin actions
- Security event tracking (suspicious logins, failed attempts, data access)
- Real-time security monitoring dashboard
- Security event resolution workflow
- Data access logging
- GDPR compliance endpoints (data export, data deletion)
- Role-based access control (RBAC) with Admin, Prime Admin, Super Admin tiers

### Admin Management System
**Status:** ✅ Fully Implemented  
**Evidence:** `app/admin/*`, `app/api/admin/*`  
**Details:**
- User management (view, suspend, unsuspend, troubleshoot, reset password)
- Admin user creation and role assignment
- Verification review and approval
- BYOI document approval
- Dispute management and decisions
- Complaint management
- Security monitoring and event resolution
- Document audit trail viewing
- Support chat access
- Blog post management

### Blog System
**Status:** ✅ Fully Implemented  
**Evidence:** `blog_posts` table, `blog_categories` table, `app/api/blog/*`, `app/admin/blog/*`  
**Details:**
- Blog post creation and editing with rich text editor (ReactQuill)
- Category and tag management
- Image upload to Supabase Storage
- AI-powered content suggestions (OpenAI GPT-3.5-turbo integration)
- Post status workflow (draft → published → archived)
- Public blog listing and detail pages
- SEO metadata generation

### Support Chat System
**Status:** ✅ Fully Implemented  
**Evidence:** `support_chat_conversations` table, `support_chat_messages` table, `components/Support/ChatWidget/index.tsx`  
**Details:**
- Real-time chat widget (appears on all pages for authenticated users)
- Email support option for guests
- Conversation persistence across sessions
- Real-time message delivery via Supabase subscriptions
- Unread message indicators
- Admin access to all conversations

### Search & Discovery
**Status:** ✅ Fully Implemented  
**Evidence:** `app/listings/page.tsx`, `components/Search/*`  
**Details:**
- Vehicle listing page with search and filtering
- Location-based filtering
- Price range filtering
- Date availability checking
- Mileage limit display
- Vehicle card components with image fallback

### Authentication & Authorization
**Status:** ✅ Fully Implemented  
**Evidence:** Supabase Auth integration, `middleware.ts`, `lib/security/routeProtection.ts`  
**Details:**
- Email/password authentication
- Magic link authentication
- Role-based access control (renter, dealer, private_host, admin, prime_admin, super_admin)
- Route protection middleware
- Session management
- Password reset functionality

---

## 4. Partially Implemented Capabilities

### Screening System (Production Provider)
**Status:** 🟡 Scaffolded, Not Production-Ready  
**Evidence:** `lib/screening/providers/CheckrProvider.ts`  
**What Exists:**
- Checkr provider class structure
- Type definitions for screening requests and results
- Provider interface implementation
**What's Missing:**
- Actual Checkr API integration (all methods throw "not yet implemented")
- Requires CHECKR_API_KEY environment variable
- Currently using MockProvider for all screening requests

### Vehicle Tier System (Booking Integration)
**Status:** 🟡 Server Logic Complete, UI Integration Pending  
**Evidence:** `app/api/bookings/eligibility/route.ts`, `lib/vehicle-tiers.ts`  
**What Exists:**
- Booking eligibility API endpoint with full tier validation
- Dealer policy enforcement logic
- Tier-based screening and insurance requirements
**What's Missing:**
- Eligibility check not called in booking creation flow
- No "Trust Gate" modal in booking UI
- Dealer rental policies settings page UI not created

### Email Notifications
**Status:** 🟡 Infrastructure Mentioned, Not Implemented  
**Evidence:** Documentation references to Brevo, no implementation found  
**What Exists:**
- Supabase Auth emails (magic links, password reset)
**What's Missing:**
- Brevo integration not found in codebase
- No transactional email sending for bookings, disputes, complaints
- No notification system for policy violations or compliance issues

### Automated Verification Computation
**Status:** 🟡 Manual Endpoint Exists, Automation Pending  
**Evidence:** `app/api/verification/compute/route.ts`  
**What Exists:**
- Verification computation logic
- Manual computation endpoint
- Document analysis rules
**What's Missing:**
- Scheduled job/cron for nightly computation
- Documentation indicates TODO for scheduled function setup

---

## 5. What Is Explicitly NOT Implemented

### AI/ML Features (Beyond Blog Suggestions)
- No automated fraud detection beyond rate limiting
- No automated document verification (OCR) - manual review only
- No predictive analytics for pricing or demand
- No automated content moderation

### Insurance Marketplace
- No third-party insurance provider integration
- Platform protection plans are fee-based, not actual insurance policies
- No insurance claims processing (only booking-related disputes)

### Credit Decisions
- No automated credit approval/rejection
- Soft credit screening provides data only, no automated decisions
- No credit score-based booking restrictions (beyond dealer policy settings)

### Advanced Automation
- No automated payout scheduling (transfers happen immediately on payment)
- No automated booking reminders or notifications
- No automated dispute escalation based on time/severity

### Mobile Applications
- Web application only (responsive design)
- No native iOS or Android apps

### Real-time Features (Beyond Chat)
- No live vehicle tracking
- No real-time availability updates (polling-based)
- No push notifications

---

## 6. Structural Differentiators (Based on Implementation)

### Multi-Tier Admin System
**Evidence:** `lib/utils/roleHierarchy.ts`, `app/api/admin/*`, `app/api/prime-admin/*`  
**Differentiation:**
- Three-tier admin hierarchy: Admin, Prime Admin, Super Admin
- Prime Admin can override Admin decisions with audit trail
- Super Admin has system-level overrides (feature-flagged)
- All admin actions are audit-logged with immutable records

### Policy Acceptance System
**Evidence:** `policy_acceptances` table, `lib/policies/content.ts`  
**Differentiation:**
- Mandatory policy acceptances for critical actions (insurance, BYOI, listing accuracy)
- Context-aware acceptances (linked to specific vehicles, bookings, etc.)
- Versioned policies with acceptance tracking
- Prevents action until acceptance is recorded

### Dealer → Renter Review System
**Evidence:** `renter_reviews` table, trust profile API  
**Differentiation:**
- Dealers review renters (not just renters reviewing vehicles)
- Reviews visible to all dealers for trust assessment
- Trust profile computation based on reviews and complaints
- Watchlisted status for problematic renters

### Structured Dispute & Complaint Systems
**Evidence:** Separate `disputes` and `dealer_complaints` tables  
**Differentiation:**
- Separate workflows for renter disputes (booking issues) and dealer complaints (renter behavior)
- Evidence upload and message threading for both
- Admin decision tracking with audit trails
- Status transition validation preventing invalid state changes

### Vehicle Tier & Compliance Enforcement
**Evidence:** Database constraints, `lib/vehicle-tiers.ts`  
**Differentiation:**
- Platform-wide minimum year enforcement (2010+) at database level
- Title type restrictions enforced via constraints
- Dealer policies can be stricter but not looser than platform rules
- Automatic tier computation via database triggers

### Real-time Security Monitoring
**Evidence:** `security_events` table, `app/admin/security/SecurityMonitoringClient.tsx`  
**Differentiation:**
- Real-time security event tracking via Supabase subscriptions
- Severity-based event classification
- Resolution workflow with audit trail
- Security reports generation (CSV/PDF)

---

## 7. Clear Value Summary (No Marketing)

Carsera provides a functional peer-to-peer car rental marketplace with complete booking, payment, and user management capabilities. The platform enforces verification requirements, manages payments through Stripe Connect with automated payouts, and provides structured workflows for disputes and complaints. Administrative controls include three-tier role hierarchy, comprehensive audit logging, and real-time security monitoring. The system includes vehicle tier-based compliance rules, dealer-configurable rental policies, and trust assessment tools for dealers. All core functionality is operational, with screening and email notification systems using mock/test implementations pending production provider integration.

**Operational Status:** Production-ready for core marketplace functionality. Screening system uses mock provider. Email notifications limited to Supabase Auth. Blog system and support chat fully operational.

**Technical Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL + Auth + Storage), Stripe (Checkout + Connect), OpenAI (blog suggestions), NHTSA API (recall data).

**Database:** 27 migration files creating comprehensive schema with RLS policies, constraints, triggers, and audit trails.

**API Endpoints:** 63+ API routes covering all major functionality with proper authentication and authorization.

---

## Appendix: Feature Evidence Matrix

| Feature | Database Table | API Route | UI Component | Status |
|---------|---------------|-----------|--------------|--------|
| Booking Creation | `bookings` | `/api/bookings/create` | `BookingForm` | ✅ |
| Payment Processing | `bookings` (payout fields) | `/api/stripe/checkout` | Checkout pages | ✅ |
| Stripe Connect | `profiles` (connect fields) | `/api/stripe/connect/onboard` | Dealer dashboard | ✅ |
| User Verification | `verification_states` | `/api/verification/compute` | Verification pages | ✅ |
| Insurance Election | `booking_insurance_elections` | Checkout flow | Checkout pages | ✅ |
| BYOI Approval | `byoi_documents` | `/api/admin/byoi/[id]/decision` | Admin dashboard | ✅ |
| Vehicle Listings | `vehicles`, `vehicle_photos` | Vehicle CRUD | Dealer vehicle pages | ✅ |
| Vehicle Tiers | `vehicles` (tier fields) | `/api/vehicles/validate` | Vehicle form | ✅ |
| Disputes | `disputes`, `dispute_messages` | `/api/disputes/*` | Renter/Admin pages | ✅ |
| Dealer Complaints | `dealer_complaints` | `/api/dealer/complaints/*` | Dealer/Admin pages | ✅ |
| Renter Reviews | `renter_reviews` | `/api/dealer/renter-reviews` | Dealer pages | ✅ |
| Trust Profiles | Computed | `/api/dealer/renters/[id]/trust-profile` | Dealer pages | ✅ |
| Screening | `screenings` | `/api/screenings/*` | Screening pages | 🟡 (Mock) |
| Security Monitoring | `security_events` | `/api/admin/security/*` | Admin dashboard | ✅ |
| Blog System | `blog_posts`, `blog_categories` | `/api/blog/*` | Blog pages | ✅ |
| Support Chat | `support_chat_conversations` | `/api/support/chat/*` | Chat widget | ✅ |
| Policy Acceptances | `policy_acceptances` | `/api/policies/accept` | Modal components | ✅ |
| Recall System | `vehicle_recall_cache` | `/api/vehicle/recalls` | Vehicle pages | ✅ |

---

**Document Accuracy:** This document is based on codebase analysis as of the audit date. All claims are verifiable through database schemas, API routes, and component files. Features marked as "Not Implemented" are explicitly absent from the codebase or exist only as TODOs/stubs.
