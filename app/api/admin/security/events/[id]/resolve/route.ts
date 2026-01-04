/**
 * Resolve Security Event
 * POST /api/admin/security/events/:id/resolve
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { protectAdminRoute } from '@/lib/security/routeProtection'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Protect route - all admins can resolve events
    const { user, profile } = await protectAdminRoute()

    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const supabase = await createClient()

    // Update security event to resolved
    const { error } = await supabase
      .from('security_events')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: 'Security event resolved successfully' })
  } catch (error: any) {
    console.error('Error resolving security event:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}