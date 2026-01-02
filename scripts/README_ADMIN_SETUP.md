# Quick Start: Adding Admin Users

## Quick Reference

### Step 1: User Signs Up
User must first create an account through the normal signup flow.

### Step 2: Get User ID
```sql
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';
```

### Step 3: Add Admin Role

**Option A: Using SQL Function (Recommended)**
```sql
SELECT add_admin_user(
  'USER_ID_HERE'::UUID,
  'super_admin',  -- or 'admin' or 'prime_admin'
  'Admin Name'
);
```

**Option B: Using Direct SQL**
```sql
UPDATE profiles
SET 
  role = 'super_admin',
  verification_status = 'approved',
  updated_at = NOW()
WHERE user_id = 'USER_ID_HERE'::UUID;
```

### Step 4: Verify
```sql
SELECT * FROM list_admin_users();
```

## Role Quick Reference

- **admin**: Regular admin access
- **prime_admin**: Admin + Document Audit access
- **super_admin**: All access + Dev tools

## Security Notes

✅ **DO:**
- Use service role key from server-side only
- Store service role key in `.env.local`
- Use the `add_admin_user()` function

❌ **DON'T:**
- Never expose service role key to client-side
- Never allow users to self-assign admin roles
- Never hardcode admin user_ids

See `docs/ADMIN_ROLES.md` for full documentation.
