import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Carsera\'s mission to revolutionize car rentals by connecting local dealers with renters in Atlanta. Discover our purpose and how we\'re building a better rental experience.',
  openGraph: {
    title: 'About Us | Carsera',
    description: 'Learn about Carsera\'s mission to revolutionize car rentals by connecting local dealers with renters in Atlanta.',
    type: 'website',
    siteName: 'Carsera',
  },
}

export default async function AboutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-brand-navy dark:text-brand-white mb-6">
            About Carsera
          </h1>
          <p className="text-xl md:text-2xl text-brand-gray dark:text-brand-white/70 max-w-3xl mx-auto">
            Revolutionizing car rentals by connecting local dealers with renters, 
            making vehicle access simple, affordable, and accessible for everyone.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-brand-blue/10 to-brand-green/10 dark:from-brand-blue/20 dark:to-brand-green/20 rounded-2xl p-8 md:p-12 mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white">
                Our Mission
              </h2>
            </div>
            <p className="text-lg text-brand-gray dark:text-brand-white/80 leading-relaxed">
              To democratize vehicle access by creating a trusted marketplace where local dealers can monetize 
              their inventory and renters can find affordable, convenient transportation. We believe everyone 
              deserves access to reliable vehicles without the barriers of traditional rental companies.
            </p>
          </div>
        </section>

        {/* Purpose Section */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-8 text-center">
            Our Purpose
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-blue dark:text-brand-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                Connect Communities
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Bridge the gap between vehicle owners and those who need temporary access, creating 
                economic opportunities for dealers while providing affordable options for renters.
              </p>
            </div>

            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                Affordable Access
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Make vehicle rental accessible to everyone by eliminating traditional barriers and 
                offering competitive pricing through our peer-to-peer marketplace model.
              </p>
            </div>

            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-blue dark:text-brand-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                Build Trust
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Create a safe, secure platform with verification, insurance requirements, and 
                automated risk mitigation to protect all parties in every transaction.
              </p>
            </div>
          </div>
        </section>

        {/* How We Do It Section */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-12 text-center">
            How We Plan to Achieve This
          </h2>
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center text-white font-bold text-xl">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Automated Verification & Trust
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  We've built an automated verification system that ensures all users are legitimate and trustworthy. 
                  Through identity verification, insurance checks, and automated risk assessment, we create a safe 
                  environment where everyone can participate with confidence.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-green dark:bg-brand-green flex items-center justify-center text-white font-bold text-xl">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Seamless Technology
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  Our platform makes renting as easy as booking a hotel. With location-based search, instant booking, 
                  secure payments, and automated processes, we remove friction from the rental experience. 
                  Everything you need is at your fingertips.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center text-white font-bold text-xl">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Local Focus, Global Vision
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  We're starting in Atlanta, building deep connections with local dealers and understanding the unique 
                  needs of our community. This local-first approach allows us to perfect our model before expanding, 
                  ensuring quality and trust at every step.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-green dark:bg-brand-green flex items-center justify-center text-white font-bold text-xl">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Continuous Innovation
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  We're constantly improving our platform based on user feedback. From AI-powered customer support 
                  to advanced fraud prevention, we leverage technology to solve real problems and create better 
                  experiences for everyone.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Each Person Matters Section */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-12 text-center">
            Why Each Person is Important
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Renters */}
            <div className="bg-gradient-to-br from-brand-blue/5 to-brand-blue/10 dark:from-brand-blue/10 dark:to-brand-blue/20 rounded-2xl p-8 border border-brand-blue/20 dark:border-brand-blue/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                  For Renters
                </h3>
              </div>
              <p className="text-brand-gray dark:text-brand-white/80 mb-4 leading-relaxed">
                You're the reason we exist. Every renter represents someone who needs reliable transportation 
                without the hassle and expense of traditional rentals. Your trust in our platform drives us 
                to create the best possible experience.
              </p>
              <ul className="space-y-2 text-brand-gray dark:text-brand-white/70">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Access to affordable, convenient vehicle rentals</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Verified, trusted dealers and hosts</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Simple booking process with secure payments</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>24/7 support and AI-powered assistance</span>
                </li>
              </ul>
            </div>

            {/* Dealers/Hosts */}
            <div className="bg-gradient-to-br from-brand-green/5 to-brand-green/10 dark:from-brand-green/10 dark:to-brand-green/20 rounded-2xl p-8 border border-brand-green/20 dark:border-brand-green/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-brand-green flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                  For Dealers & Hosts
                </h3>
              </div>
              <p className="text-brand-gray dark:text-brand-white/80 mb-4 leading-relaxed">
                You're the backbone of our platform. Every vehicle you list creates opportunity—for you to 
                generate income and for renters to access transportation. Your participation makes this 
                marketplace possible.
              </p>
              <ul className="space-y-2 text-brand-gray dark:text-white/70">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Monetize idle inventory and generate passive income</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Reach a wider audience of potential renters</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Automated verification and risk protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Easy listing management and payment processing</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-brand-navy to-brand-navy-dark dark:from-brand-navy-light dark:to-brand-navy rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join Us on This Journey
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Whether you're looking to rent a vehicle or list one, you're part of building a better 
            future for transportation access.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/listings"
              className="px-8 py-3 bg-brand-white text-brand-navy rounded-lg font-semibold hover:bg-brand-white/90 transition-colors"
            >
              Browse Vehicles
            </Link>
            <Link
              href="/dealer"
              className="px-8 py-3 bg-brand-blue text-white rounded-lg font-semibold hover:bg-brand-blue-dark transition-colors"
            >
              List Your Vehicle
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
