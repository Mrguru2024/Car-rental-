# 📘 Carsera Marketplace SOP (MASTER)

**Domain:** carseraus.com  
**Product Type:** Peer-to-Dealer Car Rental Marketplace  
**Positioning:** Premium Automotive · Asset Monetization · Trust-First Marketplace

---

## 1. Platform Purpose & Objective

### 1.1 Primary Goal

Build a scalable car rental marketplace that generates **passive income** sufficient to fund additional businesses.

### 1.2 Business Objective

- Enable dealers to monetize **idle or stale inventory** (30+ days).
- Provide renters with a **simpler, lower-friction alternative** to traditional rental companies.
- Operate as an **Airbnb-style marketplace** for vehicles.

---

## 2. Platform Legal Definition (Foundational)

### 2.1 What Carsera IS

- A technology marketplace
- A booking and payment facilitator
- A neutral administrator of processes

### 2.2 What Carsera IS NOT

- ❌ Vehicle owner
- ❌ Vehicle operator
- ❌ Insurance provider
- ❌ Legal arbitrator
- ❌ Party to the rental agreement

> Carsera administers process — **not outcomes, fault, or liability**.

This positioning must appear consistently across UI, checkout, emails, and legal documents.

---

## 3. User Roles & Access Control

### 3.1 Roles

- **Renter**
- **Dealer**
- **Private Host**
- **Admin**
- **Prime Admin**
- **Super Admin**

### 3.2 Access Enforcement

- Supabase Auth + Row-Level Security (RLS)
- Users may access **only their own data**
- Public access limited to **active vehicle listings**

---

## 4. Target Market

### 4.1 Dealers (Supply Side)

- Independent dealers
- Local dealerships
- National dealer groups
- Fleet owners
- Private vehicle owners

**Pain Point:** Idle vehicles losing value  
**Solution:** Convert inventory into passive revenue

---

### 4.2 Renters (Demand Side)

- Local residents
- Travelers
- Gig workers
- Insurance replacement renters

**Pain Point:** High deposits, red tape, rigid rules  
**Solution:** Simple booking, transparent pricing

---

## 5. Core Product Principles

1. **Simplicity First**
2. **Trust Without Excessive Friction**
3. **Asset Protection**
4. **MVP Discipline**

---

## 6. Technology Stack (Locked)

- **Frontend:** Next.js 16.1.1 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS (brand-locked)
- **Backend:** Supabase (Postgres, Auth, Storage, RLS)
- **Payments:** Stripe Checkout + Connect + Webhooks
- **IDE:** Cursor

---

## 7. Verification SOP

### 7.1 Dealer Verification

**Required:**

- Business name & address
- Dealer license or EIN
- Proof of insurance
- Vehicle ownership or control evidence

**Status Flow:** `pending → approved → rejected`

---

### 7.2 Renter Verification

**Required:**

- Legal name
- Driver's license (front & back)
- Contact information
- Residential address

**Optional:**

- Selfie verification

---

## 8. Vehicle Listing SOP

### 8.1 Required Vehicle Data

- Make
- Model
- Year
- Daily / weekly / monthly rates
- Mileage limit (optional)
- Transmission
- Fuel type
- Pickup location
- Availability status

---

### 8.2 Media Requirements

- Dealer-uploaded photos stored in `vehicle-photos`
- Fallback image system enforced (see §9)

---

## 9. Vehicle Image Fallback System (MANDATORY)

### 9.1 Purpose

Ensure **every vehicle listing displays an image**, even if dealer photos are missing.

### 9.2 Image Source Priority

1. Dealer-uploaded photos
2. Cached provider images (VIN-based)
3. Default placeholder (last resort)

### 9.3 Database Additions

**vehicle_image_map**

- `id` (uuid, pk)
- `vehicle_key_hash` (text, unique)
- `provider` (`vinaudit`)
- `provider_vehicle_id` (nullable)
- `image_urls` (jsonb)
- `updated_at` (timestamptz)

This key is used to fetch and cache fallback images.

### 9.4 Storage Buckets

- `vehicle-photos`
- `verification-docs`
- `byoi-docs`
- `claim-photos`

---

## 10. Booking & Rental Flow SOP

### 10.1 Booking Steps

1. Renter searches vehicles
2. Selects dates and mileage limits
3. Views pricing breakdown
4. Selects insurance option (Protection Plan or BYOI)
5. If BYOI: Uploads documents and accepts liability
6. Proceeds to payment
7. Booking confirmed upon payment success

---

### 10.2 Booking Statuses

- **Draft**: Initial booking created, awaiting coverage selection
- **Pending Payment**: Coverage selected, awaiting payment
- **Confirmed**: Payment received, booking active
- **Completed**: Rental period finished, eligible for review
- **Canceled**: Booking canceled (with refund tracking)

---

### 10.3 Booking Rules

- Prevent overlapping bookings
- Server-side date validation
- Insurance selection is immutable after booking
- Cancellation allowed with refund policy enforcement
- Completion required before reviews can be submitted

---

## 11. Payment Processing SOP

### 11.1 Payment Flow

- Stripe Checkout used for renter payments
- Payment required before booking confirmation
- Stripe Connect for dealer payouts

---

### 11.2 Stored Payment Data

- Stripe Checkout Session ID
- Stripe Payment Intent ID
- Stripe Transfer ID (for dealer payouts)

---

### 11.3 Platform Fees

- Platform commission calculated per booking
- Clearly displayed before checkout
- Fees deducted before dealer payout

---

## 12. Insurance & Liability SOP

### 12.1 Coverage Selection (Mandatory)

Renters must select one:

1. **Platform Protection Plan** (Basic / Standard / Premium)
2. **BYOI** (Bring Your Own Insurance)

No booking may be confirmed without valid coverage selection.

---

### 12.2 BYOI Workflow

- Renter uploads insurance documents to `byoi-docs`
- Admin review and approval required
- Renter must accept liability acknowledgment
- Selection logged and immutable

---

### 12.3 Accident Reporting & Claims

- Incidents must be reported within **24 hours**
- Claims initiated via `/renter/claims/new`
- Carsera routes claims but **never determines fault**

See:

- `/docs/INSURANCE.md`
- `/docs/LIABILITY.md`
- `/docs/BYOIPLAN.md`

---

## 13. Disputes & Arbitration

### 13.1 Resolution Flow

1. Automated review
2. Admin review (documentation only)
3. Binding arbitration

---

### 13.2 Legal Safeguards

- Mandatory arbitration
- Class action waiver
- Carsera liability capped at platform fees

---

## 14. Admin Operations SOP

### 14.1 Responsibilities

- Review & approve dealers
- Review & approve renters
- Moderate vehicle listings
- Review BYOI documents
- Process claims
- Review document verification audits
- Manage user roles and permissions

---

### 14.2 Admin Tools

- Verification dashboard
- Approve / reject controls
- Read-only booking visibility
- BYOI approval dashboard (`/admin/byoi`)
- Claims dashboard
- Document audit dashboard (`/admin/document-audit`)

Admins **never assign fault or liability**.

---

## 15. Security & Data Protection

- Supabase Row-Level Security (RLS)
- Private storage for sensitive documents
- Immutable audit logs for:
  - Coverage selection
  - Liability acceptance
  - Admin actions
  - Document verification
  - Security events

---

## 16. MVP Scope Boundaries

### Included (Core MVP)

- Auth & onboarding
- Verification workflows
- Vehicle listings
- Dealer photos + fallback image system
- Search & booking
- Stripe payments
- Admin approvals
- Protection Plans
- BYOI upload & approval
- Liability acceptance
- Claims intake

### Included (Post-MVP Enhancements)

- Reviews & ratings system
- Saved/favorite vehicles
- Booking cancellation with refunds
- Booking completion workflow
- Enhanced analytics dashboard
- Calendar view for availability
- Price alerts (database structure ready)

---

### Post-MVP Features (Now Included)

The following features have been implemented post-MVP:

- **Reviews & Ratings System** ✅
  - Renters can review vehicles and dealers after completed bookings
  - Separate ratings for vehicle and dealer (1-5 stars)
  - Written reviews optional
  - Auto-updating average ratings
  - Review moderation capabilities

- **Saved/Favorite Vehicles** ✅
  - Renters can save vehicles for easy access
  - Saved vehicles page for quick browsing
  - Heart icon on vehicle cards and detail pages

- **Booking Cancellation** ✅
  - Renters and dealers can cancel bookings
  - Automated refund processing via Stripe
  - Cancellation policy with refund tiers:
    - 48+ hours: Full refund
    - 24-48 hours: 50% refund
    - <24 hours: No refund (plan fees refunded)
  - Stripe transfer reversal for dealer payouts

- **Booking Completion** ✅
  - Manual completion by renters/dealers
  - Automatic completion for past bookings
  - Required for review eligibility

- **Enhanced Analytics Dashboard** ✅
  - Revenue metrics and trends
  - Occupancy rate calculations
  - Top performing vehicles
  - Monthly revenue charts
  - Performance insights for dealers

- **Calendar View** ✅
  - Visual availability calendar for dealers
  - Filter by vehicle
  - Month navigation
  - Color-coded booking statuses

### Explicitly Excluded (Future)

- Insurance marketplace
- Messaging system
- GPS / telematics
- Dynamic pricing engine
- Delivery logistics
- AI recommendations

---

## 17. Definition of Done (MVP)

The MVP is complete when:

- Verified dealers can list vehicles
- Verified renters can book vehicles
- Payments process successfully
- Overlapping bookings are prevented
- Admin approvals function correctly
- Every listing displays an image
- Platform operates end-to-end without manual intervention

### Post-MVP Completion Status

Additional features have been implemented:

- ✅ Reviews & ratings system fully functional
- ✅ Saved vehicles feature operational
- ✅ Cancellation system with automated refunds
- ✅ Booking completion workflow
- ✅ Analytics dashboard with comprehensive metrics
- ✅ Calendar view for dealer availability management

---

## 18. Brand Color System (Locked)

### Palette: Trust + Asset Protection + Simplicity

**Primary (Authority / App Base)**
- Midnight Navy — `#0B1C2D`

**Secondary (Navigation / Links)**
- Trust Blue — `#1F6AE1`

**Accent (Actions / Book / Pay)**
- Success Green — `#2ECC71`

**Neutrals (Backgrounds / Text)**
- Soft White — `#F5F7FA`
- Slate Gray — `#6B7280`

### Rationale

- Matches fintech + mobility trust patterns
- Signals professionalism and security
- Optimized for Stripe checkout flows
- Encourages confidence for dealers listing assets

**Psychological Effect:**

> "This feels safe, legit, and easy to use."

---

## 19. Responsive Design Standards

### Breakpoint System

The platform uses a comprehensive breakpoint system optimized for all device sizes:

- **xs**: `375px` - Large phones (iPhone X, Pixel, etc.)
- **fold**: `512px` - Samsung Z Fold unfolded, small tablets
- **sm**: `640px` - Small tablets
- **md**: `768px` - Tablets (iPad)
- **lg**: `1024px` - Small laptops
- **xl**: `1280px` - Desktops
- **2xl**: `1536px` - Large desktops
- **3xl**: `1920px` - Full HD displays
- **4xl**: `2560px` - Ultra-wide/QHD displays

### Design Principles

- Mobile-first approach
- Progressive enhancement
- Touch-friendly (minimum 44x44px targets)
- Smooth transitions between breakpoints
- Consistent spacing and typography scaling
- Full responsiveness across all device sizes

---

## 20. Guiding Principle

> Build for trust, simplicity, and asset efficiency — not feature volume.

This SOP is **authoritative** and must be followed strictly during development to prevent scope creep and ensure a focused, scalable platform.
