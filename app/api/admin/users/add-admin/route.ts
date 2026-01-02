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
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Additional security: Check for API key or other auth mechanism
    const apiKey = request.headers.get('x-api-key')
    const expectedApiKey = process.env.ADMIN_API_KEY // Set this in .env.local

    // Optional: Require API key for extra security
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, role, full_name } = body

    // Validate inputs
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const allowedRoles = ['admin', 'prime_admin', 'super_admin']
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${allowedRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Use service role client
    const supabase = createAdminClient()

    // Call the secure database function
    const { data, error } = await supabase.rpc('add_admin_user', {
      p_user_id: user_id,
      p_role: role,
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
      message: `User added as ${role} successfully`,
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
