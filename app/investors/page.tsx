import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Investors',
  description: 'Investment opportunities with Drivana. Learn about our business model, growth potential, and how to get involved in revolutionizing the car rental industry.',
  openGraph: {
    title: 'Investors | Drivana',
    description: 'Investment opportunities with Drivana. Learn about our business model and growth potential.',
    type: 'website',
    siteName: 'Drivana',
  },
}

export default async function InvestorsPage() {
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
            Investor Relations
          </h1>
          <p className="text-xl md:text-2xl text-brand-gray dark:text-brand-white/70 max-w-3xl mx-auto">
            Join us in revolutionizing the car rental industry through technology, 
            trust, and community-driven innovation.
          </p>
        </div>

        {/* Opportunity Overview */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-brand-blue/10 to-brand-green/10 dark:from-brand-blue/20 dark:to-brand-green/20 rounded-2xl p-8 md:p-12 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-6">
              The Opportunity
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                  Market Size
                </h3>
                <p className="text-brand-gray dark:text-brand-white/80 leading-relaxed mb-4">
                  The global car rental market is valued at over $100 billion and growing. 
                  The peer-to-peer car sharing segment represents a significant opportunity 
                  for disruption, especially in underserved markets like Atlanta.
                </p>
                <ul className="space-y-2 text-brand-gray dark:text-brand-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green font-bold">•</span>
                    <span>Growing demand for flexible, affordable transportation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green font-bold">•</span>
                    <span>Underutilized vehicle inventory in dealer lots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green font-bold">•</span>
                    <span>Technology enabling trust and automation</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                  Our Advantage
                </h3>
                <p className="text-brand-gray dark:text-brand-white/80 leading-relaxed mb-4">
                  Drivana combines the best of marketplace models with automated trust systems, 
                  creating a defensible position in the market through technology and community.
                </p>
                <ul className="space-y-2 text-brand-gray dark:text-brand-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green font-bold">•</span>
                    <span>Automated verification and risk mitigation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green font-bold">•</span>
                    <span>Local-first approach building deep market penetration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green font-bold">•</span>
                    <span>Scalable technology platform</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Business Model */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-12 text-center">
            Business Model
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50">
              <div className="w-12 h-12 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-blue dark:text-brand-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                Transaction Fees
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Revenue from service fees on each completed rental transaction. 
                Sustainable, scalable revenue model aligned with platform growth.
              </p>
            </div>

            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50">
              <div className="w-12 h-12 rounded-lg bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                Premium Features
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Optional premium services for dealers including featured listings, 
                analytics, and enhanced marketing tools.
              </p>
            </div>

            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50">
              <div className="w-12 h-12 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-blue dark:text-brand-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                Data & Analytics
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Aggregated market insights and analytics services for dealers and 
                industry partners, creating additional revenue streams.
              </p>
            </div>
          </div>
        </section>

        {/* Growth Strategy */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-12 text-center">
            Growth Strategy
          </h2>
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center text-white font-bold text-xl">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Atlanta Market Domination
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  Deep penetration in the Atlanta market, building strong relationships with local dealers 
                  and establishing Drivana as the go-to platform for car rentals. Focus on quality over 
                  quantity, ensuring high satisfaction rates and organic growth.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-green dark:bg-brand-green flex items-center justify-center text-white font-bold text-xl">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Regional Expansion
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  Expand to neighboring cities and states, replicating the Atlanta model. Each new market 
                  benefits from proven processes, technology infrastructure, and brand recognition built 
                  in our initial market.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-blue dark:bg-brand-blue-light flex items-center justify-center text-white font-bold text-xl">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Technology Innovation
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  Continuous platform improvements including AI-powered features, mobile app development, 
                  and advanced matching algorithms. Technology creates competitive moats and improves 
                  user experience.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-green dark:bg-brand-green flex items-center justify-center text-white font-bold text-xl">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-3">
                  Strategic Partnerships
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 leading-relaxed">
                  Partnerships with dealership networks, insurance providers, and automotive service 
                  companies to expand inventory, reduce friction, and create additional value for users.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Investment Highlights */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-12 text-center">
            Investment Highlights
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                Proven Technology Stack
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Built on modern, scalable infrastructure with automated verification, risk mitigation, 
                and payment processing already in place. Technology is production-ready and battle-tested.
              </p>
            </div>

            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                Experienced Team
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Team with expertise in technology, marketplace operations, and automotive industry. 
                Committed to building a sustainable, profitable business.
              </p>
            </div>

            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                Clear Path to Profitability
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Lean operations model with low overhead. Revenue scales with transactions, creating 
                clear path to profitability as user base grows.
              </p>
            </div>

            <div className="bg-white dark:bg-brand-navy-light rounded-xl p-6 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
                Defensible Market Position
              </h3>
              <p className="text-brand-gray dark:text-brand-white/70">
                Network effects, trust systems, and local market knowledge create barriers to entry. 
                Early mover advantage in underserved markets.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-gradient-to-r from-brand-navy to-brand-navy-dark dark:from-brand-navy-light dark:to-brand-navy rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Interested in Investing?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            We're always looking for strategic partners and investors who share our vision 
            of making vehicle access more accessible and affordable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:investors@drivana.com"
              className="px-8 py-3 bg-brand-white text-brand-navy rounded-lg font-semibold hover:bg-brand-white/90 transition-colors"
            >
              Contact Investors Relations
            </a>
            <Link
              href="/about"
              className="px-8 py-3 bg-brand-blue text-white rounded-lg font-semibold hover:bg-brand-blue-dark transition-colors"
            >
              Learn More About Us
            </Link>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20">
            <p className="text-white/80">
              <strong>Email:</strong> <a href="mailto:investors@drivana.com" className="underline hover:text-white">investors@drivana.com</a>
            </p>
            <p className="text-white/80 mt-2">
              <strong>Subject Line:</strong> Investment Inquiry
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
