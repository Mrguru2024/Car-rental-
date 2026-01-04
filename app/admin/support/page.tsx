import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import SupportClient from './SupportClient'
import { protectAdminRoute } from '@/lib/security/routeProtection'

export default async function SupportPage() {
  // Protect route - all admins can access
  const { user, profile } = await protectAdminRoute()

  if (!user || !profile) {
    redirect('/')
  }

  const supabase = await createClient()

  // Get recent bookings for support
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(
      'id, start_date, end_date, status, total_price, created_at, profiles!bookings_renter_id_fkey(id, full_name, email), vehicles(id, make, model, year)'
    )
    .order('created_at', { ascending: false })
    .limit(20)

  // Get pending verifications count
  const { count: pendingVerificationsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'pending')

  // Get pending BYOI count
  const { count: pendingByoiCount } = await supabase
    .from('byoi_documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Get recent claims
  const { data: recentClaims } = await supabase
    .from('claims')
    .select('id, claim_type, status, description, created_at, profiles(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Tech Support & Customer Service
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Account approvals and customer support tools
          </p>
        </div>

        <SupportClient
          recentBookings={recentBookings || []}
          recentClaims={recentClaims || []}
          pendingVerificationsCount={pendingVerificationsCount || 0}
          pendingByoiCount={pendingByoiCount || 0}
        />
      </div>
    </div>
  )
}
