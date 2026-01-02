# Route Protection Documentation

## Overview

This document outlines the route protection strategy for Carsera, ensuring that:
1. Public pages are accessible without authentication
2. Protected pages require authentication
3. Role-based access control is enforced
4. API routes are properly secured

## Public Routes

These routes are accessible without authentication:

- `/` - Homepage
- `/auth` - Authentication page
- `/auth/callback` - OAuth callback handler
- `/listings` - Browse all vehicle listings
- `/listings/[id]` - Individual vehicle detail pages
- `/faq` - Frequently Asked Questions
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service
- `/dealer-agreement` - Dealer Agreement
- `/about` - About Us page
- `/investors` - Investors page

## Protected Routes

### Authentication Required

These routes require the user to be logged in:

- `/onboarding` - User onboarding and role selection
- `/renter/*` - Renter dashboard and pages
- `/dealer/*` - Dealer dashboard and pages
- `/admin/*` - Admin dashboard and pages
- `/bookings/*` - Booking management pages

### Role-Based Access

#### Renter Routes (`/renter/*`)
- **Required Role**: `renter`
- **Access**: Only users with renter role
- **Redirect**: `/onboarding` if wrong role

#### Dealer Routes (`/dealer/*`)
- **Required Roles**: `dealer` or `private_host`
- **Access**: Only users with dealer or private host role
- **Redirect**: `/onboarding` if wrong role

#### Admin Routes (`/admin/*`)
- **Required Role**: `admin`
- **Access**: Only users with admin role
- **Redirect**: `/` (homepage) if not admin

#### Booking Routes (`/bookings/*`)
- **Access**: 
  - Renters can access their own bookings
  - Dealers can access bookings for their vehicles
  - Admins can access all bookings
- **Redirect**: `/auth` if not authenticated, `/onboarding` if wrong role

## API Route Protection

### Public API Routes

- `/api/stripe/webhook` - Stripe webhook (verified by signature, not auth)

### Protected API Routes

All other API routes require authentication:

- `/api/bookings/*` - Requires authentication, role checks in route handler
- `/api/security/*` - Requires authentication, user can only access their own data
- `/api/verification/*` - Requires authentication, role checks in route handler

## Implementation

### Middleware Protection

The main protection is handled in `lib/supabase/middleware.ts`:

1. **Public Path Check**: Checks if path is in public paths list
2. **Authentication Check**: Redirects to `/auth` if not authenticated
3. **Role Check**: Verifies user role matches route requirements
4. **Security Headers**: Applies security headers to all responses

### Page-Level Protection

Pages can use `protectRoute()` utilities from `lib/security/routeProtection.ts`:

```typescript
import { protectRenterRoute } from '@/lib/security/routeProtection'

export default async function RenterPage() {
  const { user, profile } = await protectRenterRoute()
  // Page content...
}
```

### API Route Protection

API routes should check authentication in the route handler:

```typescript
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Route logic...
}
```

## Security Considerations

1. **Never trust client-side checks**: Always verify on server
2. **Use middleware for route-level protection**: Prevents unauthorized access
3. **Use RLS policies**: Database-level security for data access
4. **Log access attempts**: Track unauthorized access attempts
5. **Rate limiting**: Protect against brute force attacks

## Testing Route Protection

To test route protection:

1. **Public routes**: Should be accessible without login
2. **Protected routes**: Should redirect to `/auth` when not logged in
3. **Role-based routes**: Should redirect to `/onboarding` when wrong role
4. **API routes**: Should return 401 when not authenticated

## Common Issues

### Issue: Redirect Loop
**Cause**: Redirecting to a protected page from another protected page
**Solution**: Always redirect to public pages (`/auth`, `/onboarding`, `/`)

### Issue: API Returns 401
**Cause**: Missing authentication token or expired session
**Solution**: Check that user is logged in and session is valid

### Issue: Wrong Role Access
**Cause**: User hasn't completed onboarding or selected wrong role
**Solution**: Redirect to `/onboarding` to complete profile setup
