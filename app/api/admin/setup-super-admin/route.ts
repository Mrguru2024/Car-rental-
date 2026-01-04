/**
 * ONE-TIME API Route: Setup Super Admin
 * 
 * SECURITY WARNING: This endpoint should be:
 * 1. Called only once
 * 2. Protected by a one-time secret key or IP whitelist
 * 3. Disabled after first use
 * 
 * Usage: POST /api/admin/setup-super-admin?secret=YOUR_SECRET_KEY
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Optional: Add a secret key check (set in .env.local)
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const expectedSecret = process.env.SUPER_ADMIN_SETUP_SECRET

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const email = '5epmgllc@gmail.com'
    const password = 'Destiny@2028'
    const role = 'super_admin'

    // Step 1: Find the user
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    const user = users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found. Please create the account first.` },
        { status: 404 }
      )
    }

    // Step 2: Update password
    const { data: updatedUser, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        password: password,
      }
    )

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`)
    }

    // Step 3: Add super_admin role
    const { data: profileId, error: roleError } = await adminSupabase.rpc('add_admin_user', {
      p_user_id: user.id,
      p_role: role,
      p_full_name: 'Super Admin',
    })

    if (roleError) {
      throw new Error(`Failed to add admin role: ${roleError.message}`)
    }

    // Step 4: Verify
    const { data: adminUsers } = await adminSupabase.rpc('list_admin_users')
    const admin = adminUsers?.find((a: any) => a.email === email)

    return NextResponse.json({
      success: true,
      message: 'Super admin account created successfully',
      user: {
        id: user.id,
        email: admin?.email || email,
        role: admin?.role || role,
        profile_id: profileId,
      },
    })
  } catch (error: any) {
    console.error('Setup super admin error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
