import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import VehicleFormClient from './VehicleFormClient'

export default async function NewVehiclePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'dealer' && profile.role !== 'private_host')) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Add New Vehicle
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            List a new vehicle for rent on the platform
          </p>
        </div>

        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
          <VehicleFormClient profileId={profile.id} />
        </div>
      </div>
    </div>
  )
}
