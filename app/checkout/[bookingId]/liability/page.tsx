import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import LiabilityAcceptanceClient from './LiabilityAcceptanceClient'

export default async function LiabilityAcceptancePage({
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
    .select('id, role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'renter') {
    redirect('/onboarding')
  }

  // Fetch booking and check coverage type
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('renter_id', user.id)
    .single()

  if (bookingError || !booking) {
    notFound()
  }

  if (booking.coverage_type !== 'byoi') {
    redirect(`/checkout/${bookingId}/coverage`)
  }

  // Check if BYOI is approved
  const { data: election } = await supabase
    .from('booking_insurance_elections')
    .select('*, byoi_documents(*)')
    .eq('booking_id', bookingId)
    .single()

  if (!election || election.coverage_type !== 'byoi' || election.byoi_documents?.status !== 'approved') {
    redirect(`/checkout/${bookingId}/byoi`)
  }

  // Check if already accepted
  const { data: existingAcceptance } = await supabase
    .from('liability_acceptances')
    .select('*')
    .eq('booking_id', bookingId)
    .single()

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
          Liability Acceptance
        </h1>
        <p className="text-brand-gray dark:text-brand-white/70 mb-8">
          Please read and accept the liability terms to continue.
        </p>

        <LiabilityAcceptanceClient
          booking={booking}
          profile={profile}
          existingAcceptance={existingAcceptance}
        />
      </div>
    </div>
  )
}