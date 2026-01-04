/**
 * Get Upload Path for Complaint Evidence
 * POST /api/dealer/complaints/:id/evidence/sign
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get complaint
    const { data: complaint } = await supabase
      .from('dealer_complaints')
      .select('*, bookings(renter_id, vehicles(dealer_id))')
      .eq('id', id)
      .single()

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    // Check if user is a party to the complaint
    const booking = (complaint as any).bookings
    const isDealer =
      (profile.role === 'dealer' || profile.role === 'private_host') &&
      booking.vehicles?.dealer_id === profile.id
    const isRenter = profile.role === 'renter' && booking.renter_id === profile.id
    const isAdmin = ['admin', 'prime_admin', 'super_admin'].includes(profile.role)

    if (!isDealer && !isRenter && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to add evidence to this complaint' }, { status: 403 })
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
      const path = `${user.id}/complaints/${id}/${timestamp}-${index}.${extension}`
      return {
        path,
        name: file.name,
        content_type: file.content_type,
      }
    })

    return NextResponse.json({
      success: true,
      uploads: uploadPaths,
      bucket: 'complaint-evidence',
      metadata: {
        complaint_id: id,
        uploaded_by: profile.id,
        uploaded_by_role: uploaderRole,
      },
    })
  } catch (error: any) {
    console.error('Evidence sign error:', error)
    return NextResponse.json({ error: 'Failed to generate upload paths' }, { status: 500 })
  }
}
