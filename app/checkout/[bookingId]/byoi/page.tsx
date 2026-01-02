import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import ByoiUploadClient from './ByoiUploadClient'

export default async function ByoiUploadPage({
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

  // Fetch booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('renter_id', user.id)
    .single()

  if (bookingError || !booking) {
    notFound()
  }

  if (booking.status !== 'draft' && booking.status !== 'pending_payment') {
    redirect(`/checkout/${bookingId}/review`)
  }

  // Check for existing BYOI document
  const { data: existingByoi } = await supabase
    .from('byoi_documents')
    .select('*')
    .eq('renter_profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Check for existing election
  const { data: existingElection } = await supabase
    .from('booking_insurance_elections')
    .select('*, byoi_documents(*)')
    .eq('booking_id', bookingId)
    .single()

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
          Upload Your Insurance Policy
        </h1>
        <p className="text-brand-gray dark:text-brand-white/70 mb-8">
          Upload your active insurance policy declaration page for approval.
        </p>

        <ByoiUploadClient
          booking={booking}
          profileId={profile.id}
          existingByoi={existingByoi}
          existingElection={existingElection}
        />
      </div>
    </div>
  )
}