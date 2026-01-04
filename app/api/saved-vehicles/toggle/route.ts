import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'renter') {
      return NextResponse.json({ error: 'Only renters can save vehicles' }, { status: 403 })
    }

    const body = await request.json()
    const { vehicle_id } = body

    if (!vehicle_id) {
      return NextResponse.json({ error: 'Missing vehicle_id' }, { status: 400 })
    }

    // Check if vehicle exists
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicle_id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_vehicles')
      .select('id')
      .eq('renter_id', profile.id)
      .eq('vehicle_id', vehicle_id)
      .single()

    if (existing) {
      // Remove from saved
      const { error: deleteError } = await supabase
        .from('saved_vehicles')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to unsave vehicle' }, { status: 500 })
      }

      return NextResponse.json({ saved: false, message: 'Vehicle removed from saved' })
    } else {
      // Add to saved
      const { error: insertError } = await supabase
        .from('saved_vehicles')
        .insert({
          renter_id: profile.id,
          vehicle_id,
        })

      if (insertError) {
        return NextResponse.json({ error: 'Failed to save vehicle' }, { status: 500 })
      }

      return NextResponse.json({ saved: true, message: 'Vehicle saved' })
    }
  } catch (error) {
    console.error('Error in POST /api/saved-vehicles/toggle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'renter') {
      return NextResponse.json({ error: 'Only renters can view saved vehicles' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const vehicle_id = searchParams.get('vehicle_id')

    if (vehicle_id) {
      // Check if specific vehicle is saved
      const { data: saved } = await supabase
        .from('saved_vehicles')
        .select('id')
        .eq('renter_id', profile.id)
        .eq('vehicle_id', vehicle_id)
        .single()

      return NextResponse.json({ saved: !!saved })
    }

    // Get all saved vehicles
    const { data: savedVehicles, error } = await supabase
      .from('saved_vehicles')
      .select('*, vehicles(*, vehicle_photos(file_path))')
      .eq('renter_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch saved vehicles' }, { status: 500 })
    }

    return NextResponse.json({ savedVehicles })
  } catch (error) {
    console.error('Error in GET /api/saved-vehicles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
