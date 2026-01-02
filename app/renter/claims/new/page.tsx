import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/Layout/Header'
import ClaimsFormClient from './ClaimsFormClient'

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/renter/claims/new')
  }

  const params = await searchParams
  const bookingId = params.bookingId

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'renter') {
    redirect('/onboarding')
  }

  // If bookingId provided, fetch booking details
  let booking = null
  if (bookingId) {
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*, vehicles(id, make, model, year), booking_insurance_elections(coverage_type)')
      .eq('id', bookingId)
      .eq('renter_id', user.id)
      .single()

    if (bookingData) {
      booking = bookingData
    }
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
          File a Claim
        </h1>
        <p className="text-brand-gray dark:text-brand-white/70 mb-8">
          Submit a claim for damage or incidents related to your rental.
        </p>

        <ClaimsFormClient booking={booking} profileId={profile.id} />
      </div>
    </div>
  )
}