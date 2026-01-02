import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import FAQ from '@/components/FAQ/FAQ'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Carsera. Get answers about car rentals, bookings, policies, and more. Ask Carsera AI for instant help.',
  openGraph: {
    title: 'FAQ | Carsera',
    description: 'Frequently asked questions about Carsera. Get answers about car rentals, bookings, policies, and more.',
    type: 'website',
    siteName: 'Carsera',
  },
  twitter: {
    card: 'summary',
    title: 'FAQ | Carsera',
    description: 'Frequently asked questions about Carsera. Get answers about car rentals, bookings, policies, and more.',
  },
}

export default async function FAQPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white flex flex-col">
      <Header user={user} />
      <main className="flex-1">
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
