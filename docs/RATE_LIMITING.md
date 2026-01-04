# Rate Limiting Configuration

This document describes the rate limiting system for API calls and user actions.

## Overview

Rate limiting prevents excessive API usage and protects against abuse. The system tracks requests per user/IP address within time windows.

## Rate Limit Actions

### User Actions

1. **`booking_attempt`**
   - Limit: 10 attempts per hour
   - Purpose: Prevent booking spam/abuse
   - Window: 1 hour

2. **`verification_submit`**
   - Limit: 5 attempts per 24 hours
   - Purpose: Prevent verification spam
   - Window: 24 hours

3. **`listing_create`**
   - Limit: 20 listings per hour
   - Purpose: Prevent listing spam
   - Window: 1 hour

### API Calls

4. **`vin_lookup`**
   - Limit: 50 lookups per hour per user/IP
   - Purpose: Prevent excessive NHTSA API calls
   - Window: 1 hour
   - Endpoint: `/api/vehicles/vin-lookup`

5. **`api_makes`**
   - Limit: 100 requests per hour per user/IP
   - Purpose: Prevent excessive NHTSA API calls (makes list is cached)
   - Window: 1 hour
   - Endpoint: `/api/vehicles/makes`

6. **`api_models`**
   - Limit: 200 requests per hour per user/IP
   - Purpose: Prevent excessive NHTSA API calls (models are cached)
   - Window: 1 hour
   - Endpoint: `/api/vehicles/models`

7. **`autodev_photos`**
   - Limit: 100 requests per hour per user/IP
   - Purpose: Prevent excessive Auto.dev API calls (paid service)
   - Window: 1 hour
   - Used in: VIN lookup endpoint when fetching photos

## Implementation

### Rate Limit Check

```typescript
import { checkRateLimit, recordRateLimitAttempt } from '@/lib/risk/rateLimit'

// Check rate limit
const rateLimitCheck = await checkRateLimit(identifier, 'vin_lookup')

if (!rateLimitCheck.allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  )
}

// Record attempt after successful operation
await recordRateLimitAttempt(identifier, 'vin_lookup')
```

### Identifier

- **Authenticated users:** Uses `user.id` as identifier
- **Unauthenticated users:** Uses IP address as identifier
- IP address extracted from `x-forwarded-for` or `x-real-ip` headers

### Response Headers

Rate-limited endpoints return standard rate limit headers:

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-01-03T18:00:00Z
Retry-After: 3600
```

## External API Rate Limits

### NHTSA API

- **Free public API** - No API key required
- **Rate limits:** Check NHTSA documentation for current limits
- **Handling:** Our rate limiting prevents excessive calls
- **Caching:** Makes/models responses cached for 24 hours (Next.js cache)

### Auto.dev API

- **Paid service** - Requires API key
- **Rate limits:** Check Auto.dev documentation for current limits
- **Handling:** Separate rate limit tracking (`autodev_photos` action)
- **Graceful degradation:** If rate limited, VIN lookup still returns data (without photos)

## Error Responses

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 3600
}
```

Response includes:
- `Retry-After` header (seconds until reset)
- `X-RateLimit-*` headers with current status

## Configuration

Rate limits are configured in `lib/risk/rateLimit.ts`:

```typescript
const RATE_LIMIT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  vin_lookup: {
    maxAttempts: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // ... other actions
}
```

## Database

Rate limits are stored in the `rate_limits` table:

- `identifier` - User ID or IP address
- `action_type` - Type of action being rate limited
- `count` - Number of attempts in current window
- `window_start` - Start of the rate limit window

## Best Practices

1. **Check before expensive operations** - Rate limit checks happen before external API calls
2. **Record after success** - Only record attempts after successful operations
3. **Graceful degradation** - Optional features (like Auto.dev photos) fail gracefully
4. **Clear error messages** - Users see helpful messages with retry information
5. **Caching** - Cache responses when possible to reduce API calls

## Monitoring

Rate limit violations are logged but don't trigger security events (they're expected behavior). Monitor:
- Rate limit table size
- Most rate-limited actions
- Users/IPs hitting limits frequently

## Adjusting Limits

To adjust rate limits:

1. Update `RATE_LIMIT_CONFIGS` in `lib/risk/rateLimit.ts`
2. Consider external API limits (NHTSA, Auto.dev)
3. Monitor usage patterns
4. Adjust based on actual usage and costs
