This key is used to fetch and cache fallback images.

### 10.4 Database Additions

**vehicle_image_map**

- id (uuid, pk)
- vehicle_key_hash (text, unique)
- provider (`vinaudit`)
- provider_vehicle_id (nullable)
- image_urls (jsonb)
- updated_at (timestamptz)

### 10.5 Storage Buckets

- `vehicle-photos`
- `verification-docs`

---

## 11. Booking & Rental Flow SOP

### 11.1 Booking Steps

1. Renter searches vehicles
2. Selects dates
3. Views pricing breakdown
4. Proceeds to payment
5. Booking confirmed upon successful payment

### 11.2 Booking Statuses

- Draft
- Pending Payment
- Confirmed
- Canceled

### 11.3 Booking Rules

- Prevent overlapping bookings
- Server-side date validation
- No double-booking allowed

---

## 12. Payment Processing SOP

### 12.1 Payment Flow

- Stripe Checkout used for renter payments
- Payment required before booking confirmation

### 12.2 Stored Payment Data

- Stripe Checkout Session ID
- Stripe Payment Intent ID

### 12.3 Platform Fees

- Platform commission calculated per booking
- Clearly displayed before checkout

---

## 13. Admin Operations SOP

### 13.1 Admin Responsibilities

- Review and approve dealer applications
- Review and approve renter applications
- Moderate vehicle listings if necessary

### 13.2 Admin Tools

- Verification dashboard
- Approve / reject controls
- Read-only visibility into bookings and vehicles

---

## 14. Security & Data Protection

- Supabase Row-Level Security (RLS) enforced
- Users can access only their own data
- Public access limited to active listings
- Sensitive documents stored privately

---

## 15. MVP Scope Boundaries

### Included

- Auth & onboarding
- Verification workflows
- Vehicle listings
- Dealer photos + fallback image system
- Search & booking
- Stripe payments
- Admin approvals

### Explicitly Excluded (Post-MVP)

- Insurance marketplace
- Messaging system
- Reviews & ratings
- GPS / telematics
- Dynamic pricing engine
- Delivery logistics
- AI recommendations

---

## 16. Definition of Done (MVP)

The MVP is complete when:

- Dealers can list verified vehicles
- Renters can book verified vehicles
- Payments process successfully
- Bookings prevent overlaps
- Admin approvals function correctly
- Every listing displays an image
- Platform operates end-to-end without manual intervention

---

## 17. Brand Color System (Locked)

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

> “This feels safe, legit, and easy to use.”

---

## 18. Guiding Principle

> Build for trust, simplicity, and asset efficiency — not feature volume.

This SOP must be followed strictly during development to prevent scope creep and ensure a focused, scalable MVP.
