# Troubleshooting 404 Errors

## Common Causes of 404 Errors

### 1. Database Migration Not Run

If you're seeing 404 errors when accessing `/admin/document-audit`, it's likely because the database tables don't exist yet.

**Solution:** Run the required migrations:

1. **Migration 011** - Document Verification Audit System
   - File: `supabase/migrations/011_add_document_verification_audit.sql`
   - Creates: `document_verification_audits` table

2. **Migration 012** - Super Admin Role
   - File: `supabase/migrations/012_add_super_admin_role.sql`
   - Creates: `add_admin_user()` and `list_admin_users()` functions

**How to Run:**
- Go to Supabase Dashboard > SQL Editor
- Copy and paste the migration SQL
- Click Run

### 2. Route Doesn't Exist

If accessing a route returns 404, check:
- Is the route file in the correct location?
- Does the file name match the route path?
- Has the dev server been restarted after creating new routes?

### 3. API Route 404

If an API endpoint returns 404:
- Check that the route file exists: `app/api/[path]/route.ts`
- Verify the HTTP method matches (GET, POST, etc.)
- Restart the dev server: `npm run dev`

## Quick Checklist

- [ ] Ran migration `011_add_document_verification_audit.sql`
- [ ] Ran migration `012_add_super_admin_role.sql`
- [ ] Restarted dev server after adding new routes
- [ ] Checked browser console for the exact URL causing 404
- [ ] Verified the route file exists in the correct location

## Which URL is Causing the 404?

To help diagnose, please check:
1. **Browser Console** - What URL shows the 404 error?
2. **Network Tab** - Which request is failing?
3. **Page** - What page were you trying to access when the error occurred?

Common URLs that might 404:
- `/admin/document-audit` - Needs migration 011
- `/api/admin/document-verification/bot-check` - Needs migration 011
- `/api/admin/users/add-admin` - Needs migration 012
