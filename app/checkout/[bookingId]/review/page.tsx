import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import ReviewClient from './ReviewClient'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/checkout')
  }

  const { bookingId } = await params

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'renter') {
    redirect('/onboarding')
  }

  // Fetch booking with vehicle details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, vehicles(id, make, model, year, price_per_day, location, vehicle_photos(file_path))')
    .eq('id', bookingId)
    .eq('renter_id', user.id)
    .single()

  if (bookingError || !booking) {
    notFound()
  }

  if (booking.status !== 'draft' && booking.status !== 'pending_payment') {
    redirect(`/bookings/${bookingId}`)
  }

  // Fetch insurance election
  const { data: election } = await supabase
    .from('booking_insurance_elections')
    .select('*, protection_plans(*), byoi_documents(*)')
    .eq('booking_id', bookingId)
    .single()

  if (!election) {
    redirect(`/checkout/${bookingId}/coverage`)
  }

  // For BYOI, check liability acceptance
  let liabilityAcceptance = null
  if (election.coverage_type === 'byoi') {
    const { data: acceptance } = await supabase
      .from('liability_acceptances')
      .select('*')
      .eq('booking_id', bookingId)
      .single()

    liabilityAcceptance = acceptance

    // Redirect if BYOI not approved or acceptance missing
    if (election.byoi_documents?.status !== 'approved' || !acceptance) {
      if (election.byoi_documents?.status !== 'approved') {
        redirect(`/checkout/${bookingId}/byoi`)
      } else {
        redirect(`/checkout/${bookingId}/liability`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-8">
          Review Your Booking
        </h1>

        <ReviewClient
          booking={booking}
          election={election}
          liabilityAcceptance={liabilityAcceptance}
        />
      </div>
    </div>
  )
}