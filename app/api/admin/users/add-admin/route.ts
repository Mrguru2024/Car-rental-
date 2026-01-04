/**
 * API Route: Add Admin User
 * 
 * SECURITY: This endpoint requires:
 * 1. Service role key (via SUPABASE_SERVICE_ROLE_KEY env var)
 * 2. Should be called from secure server-side scripts only
 * 3. Never expose this endpoint to public clients
 * 
 * Recommended: Add additional authentication layer:
 * - API key authentication
 * - IP whitelist
 * - Or restrict to internal services only
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

    if (!requesterProfile) {
      return NextResponse.json({ error: 'Requester profile not found' }, { status: 403 })
    }

    // Verify requester is an admin role
    if (
      requesterProfile.role !== 'admin' &&
      requesterProfile.role !== 'prime_admin' &&
      requesterProfile.role !== 'super_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, role, full_name } = body

    // Validate inputs
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Default to 'admin' role if not specified (for admin portal registrations)
    // Users registered via admin portal default to 'admin' role
    const defaultRole = 'admin'
    const finalRole = role || defaultRole

    const allowedRoles = ['admin', 'prime_admin', 'super_admin']
    if (!allowedRoles.includes(finalRole)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${allowedRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Only super_admin can assign prime_admin or super_admin roles
    // Regular admins can only create users with 'admin' role (or default)
    if ((finalRole === 'prime_admin' || finalRole === 'super_admin') && requesterProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only super_admin can assign prime_admin or super_admin roles' },
        { status: 403 }
      )
    }

    // Use service role client for database operations
    const adminSupabase = createAdminClient()

    // Call the secure database function
    // Pass finalRole (or null to use default 'admin' in database function)
    // If role is not provided, pass null to let database function default to 'admin'
    const { data, error } = await adminSupabase.rpc('add_admin_user', {
      p_user_id: user_id,
      p_role: role ? finalRole : null, // Pass null if role not provided to use default 'admin'
      p_full_name: full_name || null,
    })

    if (error) {
      console.error('Error adding admin user:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to add admin user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile_id: data,
      message: `User added as ${finalRole} successfully`,
    })
  } catch (error: any) {
    console.error('Add admin user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET: List all admin users (for verification)
 */
export async function GET(request: Request) {
  try {
    // Additional security check
    const apiKey = request.headers.get('x-api-key')
    const expectedApiKey = process.env.ADMIN_API_KEY

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('list_admin_users')

    if (error) {
      console.error('Error listing admin users:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to list admin users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, admins: data || [] })
  } catch (error: any) {
    console.error('List admin users error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
