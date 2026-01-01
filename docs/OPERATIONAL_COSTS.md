# Operational Costs Analysis

This document lists all functions and features that generate operational costs in Drivana.

## Cost Categories

### 1. External API Services

#### VinAudit Image API

**Location:** `lib/images/providers/vinaudit.ts`
**Function:** `getVinAuditImage()`
**Cost Model:** Per API call (typically $0.10 - $0.50 per request)
**Triggered When:**

- Vehicle listing has no host-uploaded photos
- Image not found in cache (`vehicle_image_map`)
- New vehicle listings without photos

**Estimated Monthly Cost:**

- Low traffic (100 listings/month): $10 - $50
- Medium traffic (1,000 listings/month): $100 - $500
- High traffic (10,000 listings/month): $1,000 - $5,000

**Mitigation:**

- Results cached in `vehicle_image_map` table
- Only called when no host photos available
- Consider: Set up image CDN or use free alternatives

---

#### Stripe Payment Processing

**Location:** `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`
**Functions:**

- Stripe Checkout Session creation
- Payment Intent processing
- Webhook handling

**Cost Model:**

- 2.9% + $0.30 per successful transaction
- No cost for failed transactions

**Triggered When:**

- User completes booking checkout
- Payment processing
- Webhook events (payment confirmation, refunds)

**Estimated Monthly Cost:**

- Based on transaction volume
- Example: $10,000 in bookings = $290 + $0.30 per transaction
- Platform fee (10%) should cover this cost

**Mitigation:**

- Built into platform fee structure
- Consider: Stripe Connect for direct dealer payments

---

### 2. Database Operations (Supabase)

#### Verification Computation

**Location:** `lib/verification/computeVerification.ts`
**Function:** `computeVerificationForUser()`
**Cost Model:** Database query operations (included in Supabase plan)

**Triggered When:**

- User signup completion
- Document upload
- Insurance update
- Nightly scheduled job (all users)

**Database Queries Per Computation:**

- 1 query: Get user profile
- 1 query: Get auth user (if admin API available)
- 1 query: Get verification documents
- 1 query: Get insurance records (for hosts)
- 1 insert/update: Store verification state

**Estimated Monthly Cost:**

- Free tier: 500MB database, 2GB bandwidth
- Pro tier ($25/month): 8GB database, 50GB bandwidth
- Scales with user count and computation frequency

**Mitigation:**

- Results cached in `verification_states` table
- Only recompute on changes
- Optimize nightly job to batch operations

---

#### Rate Limiting Storage

**Location:** `lib/risk/rateLimit.ts`
**Function:** `checkRateLimit()`, `recordRateLimitAttempt()`
**Cost Model:** Database writes (Supabase)

**Triggered When:**

- Every booking attempt
- Every verification submit
- Every listing create

**Database Operations:**

- 1 query: Check existing rate limit records
- 1 delete: Clean up old records
- 1 insert/update: Record new attempt

**Estimated Monthly Cost:**

- Minimal (small records, frequent cleanup)
- Included in Supabase plan limits

**Mitigation:**

- Automatic cleanup of old records
- Consider: Move to Redis/Upstash for high traffic (additional cost)

---

#### Image Cache Storage

**Location:** `lib/images/getVehicleDisplayImage.ts`
**Function:** `getVehicleDisplayImage()`
**Cost Model:** Database storage (Supabase)

**Triggered When:**

- VinAudit API returns image
- Fallback image used

**Storage:**

- `vehicle_image_map` table stores cached image URLs
- Minimal storage per record (~1KB per vehicle)

**Estimated Monthly Cost:**

- Included in Supabase database storage
- 1,000 vehicles = ~1MB storage

**Mitigation:**

- Efficient caching reduces API calls
- Consider: External CDN for image delivery

---

### 3. File Storage (Supabase Storage)

#### Vehicle Photos

**Location:** Supabase Storage bucket `vehicle-photos`
**Cost Model:** Storage + bandwidth (Supabase)

**Triggered When:**

- Dealers upload vehicle photos
- Photos displayed on listings

**Storage Costs:**

- Free tier: 1GB storage, 2GB bandwidth
- Pro tier ($25/month): 100GB storage, 200GB bandwidth
- Additional: $0.021/GB storage, $0.09/GB bandwidth

**Estimated Monthly Cost:**

- 1,000 vehicles × 5 photos × 2MB = 10GB storage
- 10,000 views × 2MB = 20GB bandwidth
- Pro tier covers this, or ~$2.10 storage + $1.80 bandwidth

**Mitigation:**

- Image compression before upload
- Lazy loading on frontend
- CDN for image delivery

---

#### Verification Documents

**Location:** Supabase Storage bucket `verification-docs`
**Cost Model:** Storage + bandwidth (Supabase)

**Triggered When:**

- Users upload verification documents
- Documents accessed for verification

**Storage Costs:**

- Similar to vehicle photos
- Typically smaller files (PDFs, images)
- Less frequently accessed

**Estimated Monthly Cost:**

- 1,000 users × 3 docs × 1MB = 3GB storage
- Minimal bandwidth (admin access only)

**Mitigation:**

- Document compression
- Automatic deletion after verification (optional)

---

### 4. Compute/Processing

#### Nightly Verification Job

**Location:** `app/api/verification/compute/route.ts`
**Function:** `GET /api/verification/compute`
**Cost Model:** Serverless function execution (Vercel/Next.js)

**Triggered When:**

- Scheduled nightly (cron job)
- Manual admin trigger

**Compute Costs:**

- Vercel Hobby: Free (limited execution time)
- Vercel Pro ($20/month): 100GB-hours included
- Additional: $0.18 per GB-hour

**Estimated Monthly Cost:**

- 1,000 users × 5 seconds × 0.5GB = ~0.7 GB-hours
- Included in Vercel Pro plan

**Mitigation:**

- Batch processing
- Optimize computation logic
- Only recompute changed users

---

#### Image Processing

**Location:** `lib/images/getVehicleDisplayImage.ts`
**Function:** `getVehicleDisplayImage()`
**Cost Model:** Serverless function execution

**Triggered When:**

- Vehicle listing page loaded
- Vehicle card rendered
- Image not in cache

**Compute Costs:**

- Minimal (simple database queries)
- Included in Vercel plan

**Estimated Monthly Cost:**

- Negligible (cached results)

---

### 5. Email/SMS Services (Supabase Auth)

#### Authentication Emails/SMS

**Location:** Supabase Auth
**Cost Model:** Per email/SMS sent

**Triggered When:**

- Magic link emails
- Phone OTP SMS
- Password reset emails

**Costs:**

- Free tier: 50,000 emails/month
- Pro tier: 500,000 emails/month
- SMS: $0.01 - $0.05 per SMS (varies by provider)

**Estimated Monthly Cost:**

- Email: Included in Supabase plan
- SMS: 1,000 users × 2 SMS = $20 - $100/month

**Mitigation:**

- Prefer email over SMS when possible
- Use email magic links (free)

---

## Summary of Monthly Cost Estimates

### Low Traffic (100 users, 100 listings)

- **Supabase Pro:** $25/month
- **Vercel Pro:** $20/month
- **VinAudit API:** $10 - $50/month
- **Stripe:** 2.9% + $0.30 per transaction
- **Total Base:** ~$55 - $95/month + transaction fees

### Medium Traffic (1,000 users, 1,000 listings)

- **Supabase Pro:** $25/month
- **Vercel Pro:** $20/month
- **VinAudit API:** $100 - $500/month
- **Stripe:** 2.9% + $0.30 per transaction
- **Storage overage:** ~$5 - $20/month
- **Total Base:** ~$150 - $570/month + transaction fees

### High Traffic (10,000 users, 10,000 listings)

- **Supabase Pro:** $25/month (may need Enterprise)
- **Vercel Pro:** $20/month (may need Enterprise)
- **VinAudit API:** $1,000 - $5,000/month
- **Stripe:** 2.9% + $0.30 per transaction
- **Storage overage:** ~$50 - $200/month
- **Redis/Upstash (optional):** $10 - $50/month
- **Total Base:** ~$1,105 - $5,295/month + transaction fees

---

## Cost Optimization Recommendations

1. **Image Fallback:**

   - Implement image compression before upload
   - Use CDN for image delivery (Cloudflare, free tier)
   - Consider free image APIs as alternative to VinAudit

2. **Database:**

   - Optimize queries with proper indexes
   - Implement query result caching
   - Use connection pooling

3. **Rate Limiting:**

   - Move to Redis/Upstash for high traffic (more cost-effective)
   - Implement in-memory caching for low traffic

4. **Verification:**

   - Only recompute on actual changes
   - Batch nightly job operations
   - Cache verification results aggressively

5. **Storage:**

   - Compress images before upload
   - Implement automatic cleanup of old documents
   - Use CDN for frequently accessed images

6. **Stripe:**
   - Consider Stripe Connect for direct dealer payments (reduces platform liability)
   - Negotiate volume discounts at scale

---

## Monitoring Costs

### Key Metrics to Track:

1. **API Calls:**

   - VinAudit API calls per month
   - Stripe API calls per month

2. **Database:**

   - Query count and execution time
   - Storage usage
   - Bandwidth usage

3. **Storage:**

   - Total storage used
   - Bandwidth consumed
   - Number of files stored

4. **Compute:**
   - Function execution time
   - Number of invocations
   - Memory usage

### Recommended Tools:

- Supabase Dashboard (database/storage metrics)
- Vercel Analytics (function execution metrics)
- Stripe Dashboard (transaction costs)
- Custom logging for API usage

---

## Cost Alerts

Set up alerts for:

- Supabase storage > 80% of plan limit
- Supabase bandwidth > 80% of plan limit
- VinAudit API calls > budget threshold
- Stripe transaction volume > expected range
- Vercel function execution time > threshold
