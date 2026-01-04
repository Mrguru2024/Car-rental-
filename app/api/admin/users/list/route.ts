/**
 * List All Users with Filters
 * Only accessible to Prime Admin and Super Admin
 * 
 * GET /api/admin/users/list?role=admin&status=pending&search=john&page=1&limit=50
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getPrimeAdminRoles, isRoleAllowed } from '@/lib/utils/roleHierarchy'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get requester profile and role
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!requesterProfile || !isRoleAllowed(requesterProfile.role, getPrimeAdminRoles())) {
      return NextResponse.json(
        { error: 'Forbidden - Prime Admin or Super Admin access required' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const verification_status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    const adminSupabase = createAdminClient()
    let query = adminSupabase
      .from('profiles')
      .select('id, user_id, full_name, email, role, verification_status, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (role) {
      query = query.eq('role', role)
    }
    if (verification_status) {
      query = query.eq('verification_status', verification_status)
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: profiles, error, count } = await query

    if (error) {
      throw error
    }

    // Get auth user emails for profiles
    const userIds = profiles?.map((p) => p.user_id).filter(Boolean) || []
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const emailMap = new Map(
      authUsers?.users
        .filter((u) => userIds.includes(u.id))
        .map((u) => [u.id, u.email]) || []
    )

    // Enrich profiles with emails
    const enrichedProfiles = profiles?.map((profile) => ({
      ...profile,
      email: profile.email || emailMap.get(profile.user_id) || 'N/A',
    }))

    return NextResponse.json({
      success: true,
      data: enrichedProfiles || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Admin user list error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
