# Vehicle Tier System - Repository Recon Summary

## Existing Schema

### Vehicles Table
- ✅ `year` (number) - exists
- ✅ `make`, `model`, `vin` - exist
- ✅ `status` ('active' | 'inactive') - exists
- ❌ `vehicle_tier` - MISSING
- ❌ `title_type` - MISSING
- ❌ `inspection_status` - MISSING
- ❌ `inspection_checked_at` - MISSING
- ❌ `inspection_notes` - MISSING

### Dealer Settings
- ❌ `dealer_rental_policies` table - MISSING
- No existing dealer policy controls found

### Renter Standing
- ✅ Renter standing grade system EXISTS
- ✅ `renter_reviews` table with ratings
- ✅ `dealer_complaints` table
- ✅ Trust profile API endpoint exists
- ✅ Standing grade computation: A-F (A=90+, B=80+, C=70+, D=60+, F<60)

### Booking Eligibility
- ✅ `/api/bookings/create` exists
- ✅ Checks: verification_status, role, rate limiting, vehicle availability
- ❌ Does NOT check: vehicle tier, title type, inspection status, dealer policies

### Policy Acceptances
- ✅ `policy_acceptances` table exists
- ✅ Policy system with `lib/policies/content.ts`
- ✅ Used for various acceptances (insurance, BYOI, listing accuracy, etc.)

## Implementation Plan

### Phase 1: Database (Additive Only)
1. Add columns to `vehicles` table
2. Create `dealer_rental_policies` table

### Phase 2: Server Logic
1. Create `/lib/vehicle-tiers.ts`
2. Tier computation function
3. Validation functions

### Phase 3: API Endpoints
1. Vehicle validation endpoint
2. Dealer policies endpoints
3. Booking eligibility endpoint (enhance existing)

### Phase 4: UI Updates
1. Vehicle form enhancements
2. Publish gate modal
3. Tier badge on listings
4. Dealer settings page
5. Booking flow enhancements

### Phase 5: Admin Controls
1. Compliance dashboard
2. Audit controls
