# OAuth Redirect URL Configuration

## Problem
When using OAuth (Google/Apple) login, you're being redirected to the production domain (`https://carseraus.com`) instead of localhost, resulting in a 404 error.

## Solution
You need to configure the redirect URLs in your Supabase dashboard to include your local development URL.

## Steps to Fix

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on **Authentication** in the left sidebar
   - Click on **URL Configuration** (under Configuration section)

3. **Add Redirect URLs**
   In the **Redirect URLs** section, add both:
   
   - `http://localhost:3000/auth/callback` (for local development)
   - `https://carseraus.com/auth/callback` (for production)
   
   Click **Add URL** for each one.

4. **Save Changes**
   - Click **Save** to apply the changes

5. **Verify Site URL**
   Make sure the **Site URL** is set correctly:
   - For development: `http://localhost:3000`
   - For production: `https://carseraus.com`
   
   (You can switch this based on your environment, or use a wildcard if supported)

## Additional Notes

- The code already uses `window.location.origin` to dynamically determine the redirect URL
- Supabase requires all redirect URLs to be explicitly whitelisted for security
- You can add multiple redirect URLs to support both development and production
- Changes take effect immediately after saving

## Testing

After configuring:
1. Restart your development server if it's running
2. Try Google/Apple OAuth login again
3. You should be redirected back to `http://localhost:3000/auth/callback` instead of the production domain
