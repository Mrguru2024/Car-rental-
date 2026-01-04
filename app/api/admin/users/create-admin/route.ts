/**
 * API Route: Create Admin User (from email/phone)
 * 
 * Allows super admin to create admin users directly from email or phone number
 * SECURITY: Only super_admin can create admin users
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Get the authenticated user making the request
    const supabase = await createClient()
    const {
      data: { user: requester },
    } = await supabase.auth.getUser()

    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get requester's profile to check role
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', requester.id)
      .single()

    if (!requesterProfile || requesterProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only super_admin can create admin users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, phone, password, role, full_name } = body

    // Validate inputs
    if ((!email && !phone) || !password) {
      return NextResponse.json(
        { error: 'Email or phone, and password are required' },
        { status: 400 }
      )
    }

    const finalRole = role || 'admin'
    const allowedRoles = ['admin', 'prime_admin', 'super_admin']
    if (!allowedRoles.includes(finalRole)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${allowedRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Use admin client to create user
    const adminSupabase = createAdminClient()

    // Create user in auth
    const createUserData: any = {
      password,
      email_confirm: true, // Auto-confirm email
      phone_confirm: phone ? true : false,
    }

    if (email) createUserData.email = email
    if (phone) createUserData.phone = phone

    const { data: authUser, error: createError } = await adminSupabase.auth.admin.createUser(createUserData)

    if (createError) {
      console.error('Error creating auth user:', createError)
      return NextResponse.json(
        { error: createError.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Add admin role using secure function
    const { data: profileId, error: addAdminError } = await adminSupabase.rpc('add_admin_user', {
      p_user_id: authUser.user.id,
      p_role: finalRole,
      p_full_name: full_name || null,
    })

    if (addAdminError) {
      // Rollback: delete the auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      console.error('Error adding admin role:', addAdminError)
      return NextResponse.json(
        { error: addAdminError.message || 'Failed to add admin role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user_id: authUser.user.id,
      profile_id: profileId,
      email: authUser.user.email,
      phone: authUser.user.phone,
      role: finalRole,
      message: `Admin user created successfully as ${finalRole}`,
    })
  } catch (error: any) {
    console.error('Create admin user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
