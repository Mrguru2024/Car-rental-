# Repo Audit: Recall Badge & Vehicle Standing System

## Step 0 - Repo Recon Results

### ✅ Existing (REUSE)

1. **NHTSA API Integration**
   - File: `lib/api/nhtsa.ts`
   - Functions: `decodeVINExtended()`, `getAllMakes()`, `getModelsForMake()`, `getModelsForMakeYear()`
   - Base URL: `https://vpic.nhtsa.dot.gov/api/vehicles`
   - **Note:** This is vPIC (VIN decoder), NOT recalls API

2. **Vehicle API Endpoints**
   - `/api/vehicles/vin-lookup` - VIN decoding
   - `/api/vehicles/makes` - Get all makes
   - `/api/vehicles/models` - Get models for make/year
   - All have rate limiting implemented

3. **Database Schema**
   - `vehicles` table exists with: `id`, `make`, `model`, `year`, `vin` (nullable), `dealer_id`, etc.
   - No recall-related tables exist

4. **Rate Limiting System**
   - File: `lib/risk/rateLimit.ts`
   - Actions: `booking_attempt`, `verification_submit`, `listing_create`, `vin_lookup`, `api_makes`, `api_models`, `autodev_photos`
   - **Need to add:** `recall_lookup` action

5. **Vehicle Listing Page**
   - File: `app/listings/[id]/page.tsx`
   - Has metadata generation, JSON-LD structured data
   - **Need to add:** Recall badge and standing components

### ❌ Missing (TO CREATE)

1. **Database Tables**
   - `vehicle_recall_cache` - Cache recall lookups
   - `vehicle_standing` - Store vehicle credibility scores

2. **NHTSA Recalls API Client**
   - Different from vPIC API
   - Base URL: `https://api.nhtsa.gov/recalls`
   - Endpoint: `/recallsByVehicle?make={MAKE}&model={MODEL}&modelYear={YEAR}`

3. **API Endpoint**
   - `/api/vehicle/recalls?vehicleId=...` - Main recall lookup endpoint

4. **Scoring Logic**
   - Badge computation (green/yellow/red)
   - Standing score computation (0-100, A-F grade)

5. **UI Components**
   - `<RecallBadge />` - Colored badge with recall count
   - `<VehicleStandingCard />` - Grade + score + reasons
   - `<RecallDetailsModal />` - Modal with full recall details

### 📝 Implementation Plan

**New Files to Create:**
1. `supabase/migrations/019_add_recall_and_standing_tables.sql`
2. `lib/nhtsa/recalls.ts` - NHTSA recalls API client
3. `lib/recalls/scoring.ts` - Badge and standing computation
4. `app/api/vehicle/recalls/route.ts` - Main API endpoint
5. `components/Vehicle/RecallBadge/index.tsx`
6. `components/Vehicle/VehicleStandingCard/index.tsx`
7. `components/Vehicle/RecallDetailsModal/index.tsx`

**Files to Modify:**
1. `lib/risk/rateLimit.ts` - Add `recall_lookup` action
2. `lib/types/database.ts` - Add types for new tables
3. `app/listings/[id]/page.tsx` - Add badge and standing components
4. `app/listings/[id]/metadata.ts` - Review/update SEO if needed

**No Duplication:**
- Reusing existing NHTSA vPIC integration for VIN decoding (if VIN available)
- Reusing existing rate limiting infrastructure
- Reusing existing vehicle API patterns
