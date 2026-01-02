# ⚡ Quick Setup: Admin Roles System

## ✅ What You Need to Do

### Step 1: Run the Database Migration (REQUIRED)

The migration file needs to be executed in your Supabase database.

**Easiest Method - Using Supabase Dashboard:**
1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file: `supabase/migrations/012_add_super_admin_role.sql`
5. Copy ALL the contents
6. Paste into the SQL Editor
7. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
8. You should see "Success. No rows returned"

**Verify it worked:**
Run this in SQL Editor:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('add_admin_user', 'list_admin_users');
```
Should return 2 rows with the function names.

### Step 2: Service Role Key (Already Done ✅)

Based on your `.env.local`, you already have `SUPABASE_SERVICE_ROLE_KEY` set. No action needed!

### Step 3: Add Your First Admin User

**Quick Method:**

1. **Sign up as a user first** (if you haven't already)
   - Go to `/auth` and create an account
   - Complete onboarding (choose any role)

2. **Get your user ID:**
   - Go to Supabase Dashboard > SQL Editor
   - Run:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';
   ```
   - Copy the `id` (UUID format)

3. **Add admin role:**
   - In SQL Editor, run:
   ```sql
   SELECT add_admin_user(
     'PASTE_YOUR_USER_ID_HERE'::UUID,
     'super_admin',
     'Your Name'
   );
   ```

4. **Verify:**
   ```sql
   SELECT * FROM list_admin_users();
   ```
   You should see your user listed.

5. **Test:**
   - Log out of the app
   - Log back in
   - You should be redirected to `/admin` dashboard
   - ✅ Done!

## 🎯 That's It!

After Step 1 (migration) and Step 3 (adding yourself as admin), everything will work.

## 📚 Need More Details?

- Full documentation: `docs/ADMIN_ROLES.md`
- Setup guide: `docs/ADMIN_ROLES_SETUP.md`
- SQL examples: `scripts/add-admin-user.sql`

## 🔧 Troubleshooting

**"Function add_admin_user does not exist"**
→ Run Step 1 (migration) first!

**"Permission denied"**
→ Service role key is already set, this shouldn't happen. Make sure you're running the SQL in Supabase Dashboard SQL Editor (not from application code).

**Can't access /admin after adding role**
→ Log out completely and log back in. Clear browser cookies if needed.
