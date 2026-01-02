# Admin Roles Setup Checklist

## ✅ Required Steps to Enable Admin Roles

### Step 1: Run Database Migration

The migration file `supabase/migrations/012_add_super_admin_role.sql` needs to be executed.

**Option A: Using Supabase Dashboard (Easiest)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/012_add_super_admin_role.sql`
4. Paste into SQL Editor
5. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`

**Option B: Using Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push

# Or run the migration directly
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/012_add_super_admin_role.sql
```

**Option C: Using psql directly**
```bash
psql -h your-db-host -U postgres -d your-database-name -f supabase/migrations/012_add_super_admin_role.sql
```

### Step 2: Verify Migration Success

Run this SQL to verify the functions were created:

```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('add_admin_user', 'list_admin_users');

-- Should return 2 rows
```

### Step 3: Verify Service Role Key is Set

Check your `.env.local` file has the service role key:

```bash
# .env.local
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**To get your service role key:**
1. Go to Supabase Dashboard
2. Navigate to **Settings** > **API**
3. Copy the `service_role` key (NOT the anon key)
4. Add it to `.env.local`

⚠️ **Important:** Never commit `.env.local` to git - it's already in `.gitignore`

### Step 4: (Optional) Set API Key for Admin Endpoint

If you want to use the API endpoint (`/api/admin/users/add-admin`), add this to `.env.local`:

```bash
ADMIN_API_KEY=your-secure-random-api-key-here
```

Generate a secure key:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### Step 5: Add Your First Admin User

**Method 1: Using SQL (Recommended for first setup)**

1. Sign up as a regular user through `/auth`
2. Get your user_id:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```
3. Add admin role:
   ```sql
   SELECT add_admin_user(
     'YOUR_USER_ID_HERE'::UUID,
     'super_admin',
     'Your Name'
   );
   ```
4. Verify it worked:
   ```sql
   SELECT * FROM list_admin_users();
   ```

**Method 2: Using Server-Side Code**

Create a one-time script (e.g., `scripts/setup-first-admin.ts`):

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

async function setupFirstAdmin() {
  const supabase = createAdminClient()
  
  // Get user_id from email (you'll need to know the email)
  // Or just use the user_id directly if you know it
  
  const { data, error } = await supabase.rpc('add_admin_user', {
    p_user_id: 'YOUR_USER_ID_HERE',
    p_role: 'super_admin',
    p_full_name: 'Your Name',
  })
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Success! Profile ID:', data)
  }
}

setupFirstAdmin()
```

### Step 6: Test Access

1. Log out and log back in
2. You should now be redirected to `/admin` dashboard
3. Verify you can access admin features
4. If you're a `super_admin`, you'll have access to all admin features

## ✅ Verification Checklist

- [ ] Migration `012_add_super_admin_role.sql` has been run
- [ ] Functions `add_admin_user` and `list_admin_users` exist
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- [ ] (Optional) `ADMIN_API_KEY` is set in `.env.local`
- [ ] At least one admin user has been created
- [ ] Can log in and access `/admin` dashboard
- [ ] Admin features are working correctly

## 🔧 Troubleshooting

### "Function add_admin_user does not exist"
- **Solution:** Run the migration SQL file (Step 1)

### "Permission denied" when calling function
- **Solution:** Make sure you're using service role key, not anon key
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Functions can only be called with service role key

### "User does not exist in auth.users"
- **Solution:** User must sign up first before adding admin role
- Verify the user_id is correct (UUID format)

### "Invalid role"
- **Solution:** Only `'admin'`, `'prime_admin'`, and `'super_admin'` are allowed
- Check spelling and case sensitivity

### Can't access `/admin` after adding role
- **Solution:** 
  - Log out completely
  - Log back in
  - Clear browser cookies if needed
  - Check that the role was set correctly: `SELECT role FROM profiles WHERE user_id = 'YOUR_USER_ID';`

## 🚀 Quick Start (TL;DR)

1. Run migration SQL in Supabase Dashboard SQL Editor
2. Add service role key to `.env.local`
3. Sign up as user, get user_id, run `add_admin_user()` function
4. Log out and back in
5. Done! ✅

## Next Steps

After setup:
- See `docs/ADMIN_ROLES.md` for full documentation
- See `scripts/add-admin-user.sql` for SQL examples
- Create additional admin users as needed
- Set up API key if using the API endpoint
