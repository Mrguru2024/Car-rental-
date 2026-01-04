import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import VerificationApprovalClient from './VerificationApprovalClient'

export default async function AdminVerificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/admin/verifications')
  }

  // Get user profile to check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'prime_admin' && profile.role !== 'super_admin')) {
    redirect('/')
  }

  // Fetch pending and rejected verifications
  const { data: pendingVerifications, error: pendingError } = await supabase
    .from('profiles')
    .select(
      'id, user_id, role, full_name, phone, address, verification_status, verification_documents, drivers_license_number, drivers_license_state, drivers_license_expiration, business_name, business_license_number, business_address, tax_id, created_at, updated_at'
    )
    .in('verification_status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })

  // Get verification states for additional context
  const userIds = pendingVerifications?.map((p) => p.id) || []
  const { data: verificationStates } = await supabase
    .from('verification_states')
    .select('user_id, status, reasons, computed_at')
    .in('user_id', userIds)

  // Create a map of verification states by user_id
  const verificationStatesMap = new Map(
    verificationStates?.map((vs) => [vs.user_id, vs]) || []
  )

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            User Verifications
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Review and approve user verification applications. Users must be approved before they can
            use the platform.
          </p>
        </div>

        <VerificationApprovalClient
          verifications={pendingVerifications || []}
          verificationStates={verificationStatesMap}
        />
      </div>
    </div>
  )
}
