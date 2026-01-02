import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import DocumentAuditClient from './DocumentAuditClient'
import { protectPrimeAdminRoute } from '@/lib/security/routeProtection'

export default async function DocumentAuditPage() {
  // Protect route - only Prime Admins can access
  const { user } = await protectPrimeAdminRoute()

  if (!user) {
    redirect('/')
  }

  const supabase = await createClient()

  // Get full profile with id for current auditor
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Get all flagged document verifications
  const { data: flaggedAudits, error: flaggedError } = await supabase
    .from('document_verification_audits')
    .select(
      '*, profiles!document_verification_audits_profile_id_fkey(id, full_name, role, user_id, verification_status, verification_documents, drivers_license_number, drivers_license_state, drivers_license_expiration, business_name, business_license_number, business_address, tax_id, created_at)'
    )
    .eq('verification_status', 'flagged')
    .order('created_at', { ascending: false })

  // Get pending audits (not yet reviewed by Prime Admin)
  const { data: pendingAudits } = await supabase
    .from('document_verification_audits')
    .select(
      '*, profiles!document_verification_audits_profile_id_fkey(id, full_name, role, user_id, verification_status, verification_documents, drivers_license_number, drivers_license_state, drivers_license_expiration, business_name, business_license_number, business_address, tax_id, created_at)'
    )
    .eq('verification_status', 'flagged')
    .is('auditor_decision', null)
    .order('created_at', { ascending: false })

  // Get stats
  const { count: totalFlagged } = await supabase
    .from('document_verification_audits')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'flagged')

  const { count: pendingReview } = await supabase
    .from('document_verification_audits')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'flagged')
    .is('auditor_decision', null)

  const { count: highSeverityFlags } = await supabase
    .from('document_verification_audits')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'flagged')
    .is('auditor_decision', null)

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
                Document Verification Audit
              </h1>
              <p className="text-brand-gray dark:text-brand-white/70">
                Review flagged documents identified by automated bot checks. This is a second-layer
                protection system to prevent fraud and invalid submissions.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
                Total Flagged
              </h3>
              <p className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                {totalFlagged || 0}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-yellow-200 dark:border-yellow-800/50">
              <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
                Pending Review
              </h3>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                {pendingReview || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-sm font-medium text-brand-gray dark:text-brand-white/70 mb-1">
                High Severity
              </h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {highSeverityFlags || 0}
              </p>
            </div>
          </div>
        </div>

        <DocumentAuditClient
          flaggedAudits={flaggedAudits || []}
          pendingAudits={pendingAudits || []}
          currentAuditorId={currentProfile?.id || null}
        />
      </div>
    </div>
  )
}
