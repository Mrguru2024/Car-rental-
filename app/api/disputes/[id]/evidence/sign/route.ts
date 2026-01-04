/**
 * Get Upload Path for Evidence (Client-side upload pattern)
 * POST /api/disputes/:id/evidence/sign
 * 
 * Returns the path structure for client-side uploads to Supabase storage
 * Client will upload directly to storage using this path
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAddEvidence } from '@/lib/disputes/transitions'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get dispute
    const { data: dispute } = await supabase
      .from('disputes')
      .select('*, bookings(renter_id, vehicles(dealer_id))')
      .eq('id', id)
      .single()

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Check if evidence can be added
    if (!canAddEvidence(dispute.status as any)) {
      return NextResponse.json(
        { error: 'Cannot add evidence to closed disputes' },
        { status: 400 }
      )
    }

    // Check if user is a party to the dispute
    const booking = (dispute as any).bookings
    const isRenter = profile.role === 'renter' && booking.renter_id === profile.id
    const isDealer =
      (profile.role === 'dealer' || profile.role === 'private_host') &&
      booking.vehicles?.dealer_id === profile.id
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isRenter && !isDealer && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to add evidence to this dispute' }, { status: 403 })
    }

    const body = await request.json()
    const { files } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files array is required' }, { status: 400 })
    }

    // Determine uploader role
    let uploaderRole = profile.role as string
    if (profile.role === 'private_host') {
      uploaderRole = 'dealer'
    }

    // Generate upload paths
    const timestamp = Date.now()
    const uploadPaths = files.map((file: { name: string; content_type: string }, index: number) => {
      const extension = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/disputes/${id}/${timestamp}-${index}.${extension}`
      return {
        path,
        name: file.name,
        content_type: file.content_type,
      }
    })

    return NextResponse.json({
      success: true,
      uploads: uploadPaths,
      bucket: 'dispute-evidence',
      // Metadata to store after upload
      metadata: {
        dispute_id: id,
        uploaded_by: profile.id,
        uploaded_by_role: uploaderRole,
      },
    })
  } catch (error: any) {
    console.error('Evidence sign error:', error)
    return NextResponse.json({ error: 'Failed to generate upload paths' }, { status: 500 })
  }
}
