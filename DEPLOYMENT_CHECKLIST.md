# Deployment Troubleshooting Checklist

## Issue: DNS is set but no real-time logs when visiting the site

This means the domain is pointing somewhere, but either:
1. No deployment exists
2. Deployment failed
3. Domain isn't connected to a deployment
4. Environment variables are missing (causing deployment to fail)

## Step 1: Identify Your Hosting Platform

Check which platform you're using:
- **Vercel** (most common for Next.js) - Go to https://vercel.com/dashboard
- **Netlify** - Go to https://app.netlify.com
- **AWS/Other** - Check your cloud provider dashboard

## Step 2: Check Deployment Status

### If using Vercel:

1. **Login to Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Check if your project appears in the list

2. **Check Recent Deployments**
   - Click on your project
   - Look at the "Deployments" tab
   - Check if there are any deployments
   - Check if the latest deployment shows:
     - ✅ Ready/Success
     - ❌ Error/Failed
     - 🔄 Building

3. **Check Deployment Logs**
   - Click on the latest deployment
   - Check the "Build Logs" tab
   - Look for errors during build

4. **Check Domain Configuration**
   - Go to Project Settings → Domains
   - Verify `www.carseraus.com` is listed
   - Check if domain shows "Valid Configuration" or error

5. **Check Environment Variables**
   - Go to Project Settings → Environment Variables
   - Verify all required variables are set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `STRIPE_SECRET_KEY`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `DATA_ENCRYPTION_KEY`
   - Make sure they're set for "Production" environment

## Step 3: Common Issues

### No Deployment Exists
**Solution:** You need to deploy the app first:
- If using Vercel CLI: `vercel --prod`
- If using Git integration: Push to your main branch
- If using Vercel dashboard: Import your Git repository

### Deployment Failed
**Common causes:**
- Missing environment variables
- Build errors (check logs)
- Dependency installation failures

**Solution:**
- Check build logs for errors
- Ensure all environment variables are set
- Verify `package.json` dependencies are correct

### Domain Not Connected
**Symptoms:**
- Domain shows in dashboard but status is "Invalid Configuration"
- DNS is set but domain doesn't point to deployment

**Solution:**
- Follow platform's domain setup instructions
- Verify DNS records match platform requirements
- Wait for DNS propagation (can take up to 48 hours)

### Environment Variables Missing
**Symptoms:**
- Build succeeds but app crashes at runtime
- 500 errors on all pages

**Solution:**
- Add all required environment variables in platform dashboard
- Redeploy after adding variables

## Step 4: Verify Deployment

Once deployment is successful:

1. **Check Deployment URL**
   - Vercel provides a URL like: `your-project.vercel.app`
   - Test if this works (bypasses DNS)

2. **Check Custom Domain**
   - Visit `www.carseraus.com`
   - Check browser console for errors
   - Check network tab for failed requests

3. **View Real-time Logs**
   - In Vercel: Project → Deployments → Click deployment → "Functions" tab
   - Look for function execution logs
   - Visit the site and watch for new log entries

## Required Environment Variables for Production

Make sure these are set in your hosting platform:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (REQUIRED)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Data Encryption (REQUIRED)
DATA_ENCRYPTION_KEY=your-64-character-hex-string

# Optional (but recommended)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-key
NEXT_PUBLIC_OPENCAGE_API_KEY=your-key
VINAUDIT_API_KEY=your-key
```

## Next Steps

1. Check your hosting platform dashboard
2. Verify a deployment exists and succeeded
3. Check environment variables are set
4. Verify domain is properly connected
5. Check deployment logs for errors
6. Redeploy if needed after fixing issues
