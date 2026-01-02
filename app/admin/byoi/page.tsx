import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import ByoiApprovalClient from './ByoiApprovalClient'

export default async function ByoiApprovalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/admin/byoi')
  }

  // Get user profile to check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  // Fetch pending BYOI documents with renter info
  const { data: byoiDocs, error } = await supabase
    .from('byoi_documents')
    .select(
      '*, profiles!byoi_documents_renter_profile_id_fkey(id, full_name, user_id)'
    )
    .in('status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
          BYOI Document Approvals
        </h1>
        <p className="text-brand-gray dark:text-brand-white/70 mb-8">
          Review and approve Bring Your Own Insurance documents submitted by renters.
        </p>

        <ByoiApprovalClient byoiDocs={byoiDocs || []} />
      </div>
    </div>
  )
}