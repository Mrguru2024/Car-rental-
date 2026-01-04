# Recall Badge & Vehicle Standing System Implementation

## Overview

This document describes the implementation of the recall badge and vehicle standing system using **FREE-only APIs** (NHTSA).

## ✅ Completed Implementation

### Step 1: Database Tables

**Migration:** `supabase/migrations/019_add_recall_and_standing_tables.sql`

1. **`vehicle_recall_cache`** - Caches recall lookups for 7 days
   - Stores recall data, badge info, severity levels
   - Indexed for fast lookups
   - RLS policies: Public read for active vehicles, service role write

2. **`vehicle_standing`** - Stores vehicle credibility scores
   - Grade (A-F) and score (0-100)
   - Human-readable reasons array
   - RLS policies: Public read for active vehicles, service role write

### Step 2: NHTSA Recalls API Integration

**File:** `lib/nhtsa/recalls.ts`

- **Endpoint:** `https://api.nhtsa.gov/recalls/recallsByVehicle`
- **Function:** `getRecallsByVehicle(make, model, modelYear)`
- **VIN Decoder:** Reuses existing `decodeVINExtended()` from vPIC API
- **Caching:** 1-hour Next.js cache for API responses
- **Error Handling:** Graceful degradation on rate limits/errors

### Step 3: Scoring Logic

**File:** `lib/recalls/scoring.ts`

**Badge Computation:**
- Green: No recalls
- Yellow: 1-2 recalls (no severe keywords)
- Red: 3+ recalls OR any severe keywords

**Severe Keywords:**
- "do not drive", "risk of crash", "fire", "air bag", "brake failure", "steering", "fuel leak", etc.

**Standing Score (0-100):**
- Starts at 100
- -15 per recall (capped at -60)
- -25 for severe keywords
- -10 for < 3 photos
- -10 for unverified dealer

**Grade Mapping:**
- A: 90-100
- B: 80-89
- C: 70-79
- D: 60-69
- F: 0-59

### Step 4: API Endpoint

**File:** `app/api/vehicle/recalls/route.ts`

**Endpoint:** `GET /api/vehicle/recalls?vehicleId=...`

**Features:**
- Rate limiting: 30 requests/hour per user/IP
- Cache-first: Returns cached data if valid (< 7 days old)
- VIN decoding: If VIN exists, uses it to confirm make/model/year
- Graceful degradation: Returns cached data on API rate limits
- Comprehensive response with badge, standing, and recall details

**Response Format:**
```json
{
  "vehicleId": "...",
  "badge": {
    "color": "green|yellow|red|gray",
    "label": "...",
    "recallCount": 0,
    "severity": "none|info|caution|urgent"
  },
  "standing": {
    "score": 100,
    "grade": "A",
    "reasons": ["..."]
  },
  "recalls": [...],
  "fetchedAt": "...",
  "expiresAt": "...",
  "cached": false
}
```

### Step 5: UI Components

1. **`RecallBadge`** (`components/Vehicle/RecallBadge/index.tsx`)
   - Colored pill badge with recall count
   - Tooltip with source and last updated date
   - Accessible with ARIA labels
   - Fails silently on errors

2. **`VehicleStandingCard`** (`components/Vehicle/VehicleStandingCard/index.tsx`)
   - Grade display (A-F) with color coding
   - Score progress bar (0-100)
   - List of factors/reasons
   - "View Safety Details" button
   - Disclaimer about credibility indicator

3. **`RecallDetailsModal`** (`components/Vehicle/RecallDetailsModal/index.tsx`)
   - Expandable recall cards
   - Summary, consequence, remedy for each recall
   - Links to NHTSA.gov for more details
   - Responsive and accessible

### Step 6: Integration

**File:** `app/listings/[id]/page.tsx`

- Badge displayed above vehicle details
- Standing card displayed below badge
- Both components fetch data client-side
- Graceful loading states

### Step 7: Rate Limiting

**File:** `lib/risk/rateLimit.ts`

- Added `recall_lookup` action
- Limit: 30 requests/hour per user/IP
- Prevents excessive NHTSA API calls

### Step 8: TypeScript Types

**File:** `lib/types/database.ts`

- Added types for `vehicle_recall_cache` and `vehicle_standing` tables
- Full type safety for all operations

## API Endpoints Used

### NHTSA Recalls API (FREE)
- **Base URL:** `https://api.nhtsa.gov/recalls`
- **Endpoint:** `/recallsByVehicle?make={MAKE}&model={MODEL}&modelYear={YEAR}`
- **No API key required**
- **Rate limits:** Check NHTSA documentation

### NHTSA vPIC API (FREE) - Reused
- **Base URL:** `https://vpic.nhtsa.dot.gov/api/vehicles`
- **Used for:** VIN decoding to confirm make/model/year
- **Already integrated:** `lib/api/nhtsa.ts`

## Caching Strategy

1. **Database Cache:** 7 days TTL for recall data
2. **Next.js Cache:** 1 hour for NHTSA API responses
3. **Client-Side:** Components cache responses in state

## Error Handling

- **API Failures:** Gracefully degrades, returns cached data if available
- **Rate Limits:** Returns cached data with warning
- **Missing Data:** Components fail silently (don't show errors to users)
- **Network Errors:** Logged server-side, client shows loading states

## Security & Privacy

- **RLS Policies:** Public can only read active vehicle data
- **No PII:** Recall data contains no personal information
- **Rate Limiting:** Prevents abuse and excessive API calls
- **Service Role:** Only server can write cache/standing data

## Testing Recommendations

1. **Unit Tests:**
   - `computeRecallBadge()` - Test badge color logic
   - `computeVehicleStanding()` - Test score calculations
   - Severe keyword detection

2. **Integration Tests:**
   - `/api/vehicle/recalls` endpoint
   - Cache hit/miss scenarios
   - Rate limiting behavior
   - Error handling

3. **E2E Tests:**
   - Badge displays correctly
   - Standing card shows accurate data
   - Modal opens and displays recalls
   - Responsive design on mobile

## Future Enhancements

1. **Background Jobs:** Pre-fetch recalls for all active vehicles
2. **Notifications:** Alert dealers when new recalls are found
3. **Analytics:** Track which vehicles have recalls
4. **Admin Dashboard:** View recall statistics
5. **Email Alerts:** Notify renters about recalls for booked vehicles

## Files Created/Modified

### New Files
- `supabase/migrations/019_add_recall_and_standing_tables.sql`
- `lib/nhtsa/recalls.ts`
- `lib/recalls/scoring.ts`
- `app/api/vehicle/recalls/route.ts`
- `components/Vehicle/RecallBadge/index.tsx`
- `components/Vehicle/VehicleStandingCard/index.tsx`
- `components/Vehicle/RecallDetailsModal/index.tsx`
- `docs/RECALL_BADGE_IMPLEMENTATION.md`

### Modified Files
- `lib/risk/rateLimit.ts` - Added `recall_lookup` action
- `lib/types/database.ts` - Added table types
- `app/listings/[id]/page.tsx` - Added badge and standing components

## Compliance

✅ **FREE-only APIs:** Only uses NHTSA (free, public APIs)  
✅ **No paid services:** No Auto.dev, CarsXE, etc.  
✅ **No duplication:** Reuses existing NHTSA vPIC integration  
✅ **Additive changes:** No breaking changes to existing features  
✅ **Rate limiting:** Prevents excessive API usage  
✅ **Caching:** Reduces API calls and improves performance  
