# Environment Variables Setup

This document outlines all required and optional environment variables for the Carsera application.

## Required Environment Variables

### Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**How to get:**
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL, anon/public key, and service_role key
4. **Important**: Service role key bypasses RLS - keep it secure and only use server-side

### Stripe Configuration

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

**How to get:**
1. Go to Stripe Dashboard > Developers > API keys
2. Copy the Publishable key and Secret key
3. For webhook secret: Create a webhook endpoint in Stripe Dashboard and copy the signing secret

### Data Encryption Key

```bash
DATA_ENCRYPTION_KEY=your_64_character_hex_string_here
```

**How to generate:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

**Important:** 
- This key is used to encrypt sensitive data at rest
- Must be exactly 64 hexadecimal characters (32 bytes)
- Keep this key secure and never commit it to version control
- If you lose this key, encrypted data cannot be decrypted

## Optional Environment Variables

### Google Places API

```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

**Purpose:** Used for address autocomplete and validation in address input fields
**How to get:** 
1. Go to https://console.cloud.google.com/
2. Create a project and enable Places API
3. Create an API key and restrict it to Places API
4. See `docs/GOOGLE_PLACES_SETUP.md` for detailed instructions

**Note:** Required for address autocomplete functionality. If not provided, address fields will work as regular text inputs without autocomplete.

### OpenCage Geocoding API

```bash
NEXT_PUBLIC_OPENCAGE_API_KEY=your_opencage_api_key
```

**Purpose:** Used for reverse geocoding in the "Search Near Me" feature
**How to get:** Sign up at https://opencagedata.com/api

**Note:** If not provided, the nearby search will still work but won't show formatted addresses

### Verification Job Secret

```bash
VERIFICATION_JOB_SECRET=your_verification_job_secret_here
```

**Purpose:** Secret token for the nightly verification computation job
**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Note:** Required if you plan to use the scheduled verification computation endpoint

### VinAudit API Key

```bash
VINAUDIT_API_KEY=your_vinaudit_api_key
```

**Purpose:** Used for vehicle image fallback when host hasn't uploaded photos
**How to get:** Sign up at https://vinaudit.com/api

**Note:** If not provided, the system will use placeholder images instead

## Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in all required variables:**
   - Supabase credentials
   - Stripe credentials
   - Generate and add DATA_ENCRYPTION_KEY

3. **Add optional variables as needed:**
   - OpenCage API key (for better location search)
   - Verification job secret (for scheduled jobs)
   - VinAudit API key (for vehicle image fallback)

4. **Never commit .env.local to version control:**
   - It's already in .gitignore
   - Contains sensitive credentials

## Security Best Practices

1. **Use different keys for different environments:**
   - Development: `.env.local`
   - Production: Set in your hosting platform (Vercel, etc.)

2. **Rotate keys regularly:**
   - Especially DATA_ENCRYPTION_KEY if compromised
   - Note: Rotating DATA_ENCRYPTION_KEY will require re-encrypting all data

3. **Use strong, random keys:**
   - Never use predictable values
   - Use the provided generation commands

4. **Limit access:**
   - Only share keys with trusted team members
   - Use environment variable management tools in production

## Production Deployment

For production deployments (e.g., Vercel):

1. Go to your project settings
2. Navigate to Environment Variables
3. Add all required variables
4. Set appropriate environment (Production, Preview, Development)
5. Redeploy your application

## Troubleshooting

### "Encryption key not configured" error
- Ensure DATA_ENCRYPTION_KEY is set in your .env.local file
- Restart your development server after adding the variable
- Verify the key is exactly 64 hexadecimal characters

### "Unauthorized" errors in API routes
- Check that Supabase credentials are correct
- Verify Stripe keys are set correctly
- Ensure you're using the correct environment (development vs production)

### Nearby search not showing addresses
- Check that NEXT_PUBLIC_OPENCAGE_API_KEY is set
- Verify the API key is valid and has remaining credits
- Check browser console for API errors
