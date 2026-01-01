import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import CheckoutClient from '@/components/Booking/CheckoutClient'

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/bookings')
  }

  const { id } = await params

  // Fetch booking with vehicle details
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(
      '*, vehicles(id, make, model, year, price_per_day, location, vehicle_photos(file_path))'
    )
    .eq('id', id)
    .eq('renter_id', user.id)
    .single()

  if (error || !booking) {
    notFound()
  }

  if (booking.status !== 'draft') {
    redirect(`/bookings/${id}/success`)
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-8">
          Complete Your Booking
        </h1>

        <CheckoutClient booking={booking} />
      </div>
    </div>
  )
}