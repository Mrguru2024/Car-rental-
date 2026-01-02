# Admin Roles & User Management

## Role Hierarchy

The system supports three admin roles with different access levels:

### 1. **admin** (Regular Admin)
- **Access:** Admin dashboard and standard admin features
- **Capabilities:**
  - View dashboard statistics
  - Approve/reject user verifications
  - Review BYOI documents
  - Monitor security events
  - Manage users and bookings

### 2. **prime_admin** (Prime Admin / Auditor)
- **Access:** All admin access + Document Audit access
- **Capabilities:**
  - Everything regular admin can do
  - Access to `/admin/document-audit` (document verification audit workflow)
  - Review flagged documents from automated bot checks
  - Final authority on document verification decisions

### 3. **super_admin** (Super Admin / Developer)
- **Access:** All admin + Prime Admin access + Dev tools
- **Capabilities:**
  - Everything prime_admin can do
  - Access to dev tools and system management
  - Full system access (future: database tools, system configuration, etc.)
  - Typically reserved for platform developers/owners

## Security Model

### Protected Functions

Admin user management uses secure database functions that:
- Only run with SERVICE ROLE key (bypasses RLS)
- Cannot be called from client-side code
- Validate roles before assignment
- Automatically approve admin users (no verification needed)

### Route Protection

- **Admin routes (`/admin/*`):** Accessible to `admin`, `prime_admin`, `super_admin`
- **Prime Admin routes (`/admin/document-audit`):** Accessible to `prime_admin`, `super_admin`
- **Super Admin routes (`/admin/dev`, `/admin/system`):** Accessible only to `super_admin`

## Adding Admin Users

### Option 1: Using SQL Function (Recommended)

**From Database Console (Supabase Dashboard > SQL Editor):**

```sql
-- Add a regular admin
SELECT add_admin_user(
  'USER_ID_HERE'::UUID,  -- Get from auth.users table
  'admin',
  'Admin User Name'
);

-- Add a prime admin
SELECT add_admin_user(
  'USER_ID_HERE'::UUID,
  'prime_admin',
  'Prime Admin Name'
);

-- Add a super admin
SELECT add_admin_user(
  'USER_ID_HERE'::UUID,
  'super_admin',
  'Super Admin Name'
);
```

**Step-by-step:**
1. User signs up through normal flow (gets account in `auth.users`)
2. Get user_id: `SELECT id, email FROM auth.users WHERE email = 'admin@example.com';`
3. Run `add_admin_user()` function with the user_id

### Option 2: Using Server-Side Code

**From a secure server-side script or API route:**

```typescript
import { addAdminUser } from '@/lib/admin/addAdminUser'

// After user signs up, add admin role
const profileId = await addAdminUser(
  userId,           // From auth.users
  'super_admin',    // Role: 'admin' | 'prime_admin' | 'super_admin'
  'Super Admin'     // Optional full name
)
```

### Option 3: Using API Endpoint (With API Key)

**From a secure script with API key:**

```bash
# Set API key in .env.local
# ADMIN_API_KEY=your-secure-api-key-here

# Add admin user via API
curl -X POST https://your-domain.com/api/admin/users/add-admin \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-api-key-here" \
  -d '{
    "user_id": "user-uuid-here",
    "role": "super_admin",
    "full_name": "Super Admin Name"
  }'
```

**Important:** The API endpoint should be:
- Only accessible from trusted IPs (if possible)
- Protected by API key authentication
- Not exposed in client-side code

### Option 4: Direct SQL (Last Resort)

Only if running from secure database console:

```sql
-- Update existing user to admin
UPDATE profiles
SET 
  role = 'super_admin',
  verification_status = 'approved',
  updated_at = NOW()
WHERE user_id = 'USER_ID_HERE'::UUID;

-- Or insert new admin profile
INSERT INTO profiles (
  user_id,
  role,
  full_name,
  verification_status,
  created_at,
  updated_at
)
VALUES (
  'USER_ID_HERE'::UUID,
  'super_admin',
  'Super Admin Name',
  'approved',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = EXCLUDED.role,
  verification_status = 'approved',
  updated_at = NOW();
```

## Listing Admin Users

### Using SQL Function

```sql
SELECT * FROM list_admin_users();
```

### Using Server-Side Code

```typescript
import { listAdminUsers } from '@/lib/admin/addAdminUser'

const admins = await listAdminUsers()
console.log(admins)
```

### Using API Endpoint

```bash
curl -X GET https://your-domain.com/api/admin/users/add-admin \
  -H "x-api-key: your-secure-api-key-here"
```

## Security Best Practices

### ✅ DO:

- Use service role key only from server-side code
- Store service role key in environment variables (`.env.local`)
- Use the `add_admin_user()` database function (validates roles)
- Add API key authentication for admin management endpoints
- Restrict admin management API endpoints to internal use only
- Log all admin role changes for audit purposes
- Use least privilege principle (give minimum role needed)

### ❌ DON'T:

- Never expose service role key to client-side code
- Never allow users to self-assign admin roles
- Never expose `add_admin_user()` function to public/anonymous users
- Don't hardcode admin user_ids in application code
- Don't allow regular admins to promote themselves or others
- Don't expose admin management endpoints without authentication

## Environment Variables

Add to `.env.local`:

```bash
# Supabase Service Role Key (for admin user management)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: API key for admin management endpoints
ADMIN_API_KEY=your-secure-random-api-key-here
```

## Complete Workflow Example

### Adding Your First Super Admin

1. **Sign up as regular user:**
   - Go to `/auth`
   - Sign up with your email/password
   - Complete onboarding (choose any role)

2. **Get your user_id:**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```

3. **Add super_admin role:**
   ```sql
   SELECT add_admin_user(
     (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
     'super_admin',
     'Your Name'
   );
   ```

4. **Verify:**
   ```sql
   SELECT * FROM list_admin_users();
   ```

5. **Test access:**
   - Log out and log back in
   - You should now have access to `/admin` dashboard
   - All admin features should be available

## Role Comparison Table

| Feature | admin | prime_admin | super_admin |
|---------|-------|-------------|-------------|
| Dashboard Access | ✅ | ✅ | ✅ |
| User Verification | ✅ | ✅ | ✅ |
| BYOI Approvals | ✅ | ✅ | ✅ |
| Security Events | ✅ | ✅ | ✅ |
| Document Audit | ❌ | ✅ | ✅ |
| Dev Tools | ❌ | ❌ | ✅ |
| System Config | ❌ | ❌ | ✅ |

## Troubleshooting

### "Function add_admin_user does not exist"
- Make sure migration `012_add_super_admin_role.sql` has been run
- Check that you're using the service role key, not anon key

### "Permission denied"
- Ensure you're calling from server-side code with service role key
- Check that service role key is set in environment variables
- Verify the function grants are correct (should only grant to service_role)

### "User does not exist in auth.users"
- User must sign up first before you can assign admin role
- Verify user_id is correct (UUID format)

### "Invalid role"
- Only 'admin', 'prime_admin', and 'super_admin' are allowed
- Check spelling and case sensitivity

## Future Enhancements

Potential future features:
- Admin role audit log
- Temporary admin access (time-limited)
- Role-based feature flags
- Admin activity monitoring
- Self-service role requests (with approval workflow)
