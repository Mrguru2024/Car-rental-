import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import Link from 'next/link'
import type { Metadata } from 'next'
import Image from 'next/image'
import HeroVideo from '@/components/Layout/HeroVideo'

export const metadata: Metadata = {
  title: 'List Your Vehicle | Earn Passive Income with Carsera',
  description: 'Monetize your idle vehicles and turn your inventory into revenue. Independent dealers, dealerships, and private hosts can earn passive income by listing cars on Carsera. Simple, secure, and profitable.',
  keywords: ['list car for rent', 'rent out car', 'car rental marketplace', 'monetize vehicles', 'passive income cars', 'dealer car rental'],
  openGraph: {
    title: 'List Your Vehicle | Earn Passive Income with Carsera',
    description: 'Monetize your idle vehicles and turn your inventory into revenue. Join Carsera today.',
    type: 'website',
    siteName: 'Carsera',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'List Your Vehicle | Earn Passive Income with Carsera',
    description: 'Monetize your idle vehicles and turn your inventory into revenue.',
  },
}

export default function ListYourVehiclePage() {
  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brand-blue via-brand-green to-brand-blue dark:from-brand-navy dark:via-brand-navy-light dark:to-brand-navy py-20 md:py-32 overflow-hidden">
        {/* Video Background */}
        <HeroVideo videoSrc="/media/videos/205669-927672553_small.mp4" />
        {/* Overlay for better text readability with brand colors */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/75 via-brand-green/65 to-brand-blue/75 dark:from-brand-navy/85 dark:via-brand-navy/80 dark:to-brand-navy/85 z-[1]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Turn Your Idle Vehicles Into
              <span className="block text-brand-green-light">Passive Income</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              Join hundreds of dealers and private hosts earning revenue from vehicles that would otherwise sit idle. 
              Simple setup, secure transactions, maximum profit.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth?redirect=/dealer"
                className="px-8 py-4 bg-white text-brand-blue rounded-lg font-semibold text-lg hover:bg-brand-gray/10 transition-colors shadow-xl"
              >
                Get Started Free
              </Link>
              <Link
                href="/dealer-agreement"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-lg font-semibold text-lg hover:bg-white/20 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-16 md:py-24 bg-brand-gray/5 dark:bg-brand-navy/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-4">
              Are These Challenges Costing You Money?
            </h2>
            <p className="text-lg text-brand-gray dark:text-brand-white/70 max-w-2xl mx-auto">
              Every day your vehicles sit idle, you're losing potential revenue
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Idle Inventory',
                description: 'Vehicles sitting on your lot for 30+ days losing value and taking up space. Every day costs you money in depreciation and opportunity cost.',
                stat: '$2,400+',
                statLabel: 'Average monthly loss per idle vehicle',
              },
              {
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Low Utilization Rates',
                description: 'Your fleet utilization is below 50%, meaning half your investment is underperforming. Traditional rental models have high overhead and low margins.',
                stat: '<50%',
                statLabel: 'Average dealer fleet utilization',
              },
              {
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Complex Operations',
                description: 'Managing rentals yourself means handling insurance, payments, damage disputes, and customer service. It\'s a full-time job you don\'t have time for.',
                stat: '40+ hours',
                statLabel: 'Monthly time saved with Carsera',
              },
            ].map((pain, index) => (
              <div
                key={index}
                className="bg-white dark:bg-brand-navy-light rounded-xl p-8 shadow-lg dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 hover:shadow-xl dark:hover:shadow-brand-navy/50 transition-all"
              >
                <div className="text-red-500 dark:text-red-400 mb-4">{pain.icon}</div>
                <h3 className="text-2xl font-bold text-brand-navy dark:text-brand-white mb-3">
                  {pain.title}
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 mb-6">
                  {pain.description}
                </p>
                <div className="pt-6 border-t border-brand-gray/20 dark:border-brand-navy/50">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {pain.stat}
                  </div>
                  <div className="text-sm text-brand-gray dark:text-brand-white/60">
                    {pain.statLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-4">
              Carsera: The Solution You've Been Waiting For
            </h2>
            <p className="text-lg text-brand-gray dark:text-brand-white/70 max-w-2xl mx-auto">
              A marketplace built specifically for dealers and private hosts to monetize inventory effortlessly
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="space-y-8">
                {[
                  {
                    icon: (
                      <div className="w-16 h-16 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-brand-green dark:text-brand-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    ),
                    title: 'Generate Passive Revenue',
                    description: 'Earn income from vehicles that are currently not generating revenue. Set your own pricing and availability to maximize returns.',
                    highlight: 'Average $1,500+ monthly revenue per vehicle',
                  },
                  {
                    icon: (
                      <div className="w-16 h-16 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-brand-blue dark:text-brand-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    ),
                    title: 'Zero Operational Hassle',
                    description: 'We handle payments, insurance coordination, damage disputes, and customer support. You just list your vehicles and earn.',
                    highlight: 'We handle 100% of the operations',
                  },
                  {
                    icon: (
                      <div className="w-16 h-16 rounded-full bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-brand-green dark:text-brand-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    ),
                    title: 'Quick & Easy Setup',
                    description: 'List your vehicles in minutes. Our intuitive platform makes it simple to add photos, set pricing, and manage availability.',
                    highlight: 'Get started in under 10 minutes',
                  },
                  {
                    icon: (
                      <div className="w-16 h-16 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-brand-blue dark:text-brand-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    ),
                    title: 'Protected & Insured',
                    description: 'Comprehensive insurance options, security deposits, and our dispute resolution system protect your assets and peace of mind.',
                    highlight: 'Full protection for your vehicles',
                  },
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-6">
                    {benefit.icon}
                    <div>
                      <h3 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-brand-gray dark:text-brand-white/70 mb-2">
                        {benefit.description}
                      </p>
                      <p className="text-sm font-semibold text-brand-green dark:text-brand-green-light">
                        ✓ {benefit.highlight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-brand-blue/10 to-brand-green/10 dark:from-brand-blue/20 dark:to-brand-green/20 rounded-2xl p-8 md:p-12 border border-brand-blue/20 dark:border-brand-blue/30">
              <div className="text-center">
                <div className="text-6xl font-bold text-brand-green dark:text-brand-green-light mb-4">
                  $1,500+
                </div>
                <div className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-2">
                  Average Monthly Revenue
                </div>
                <div className="text-brand-gray dark:text-brand-white/70 mb-8">
                  Per listed vehicle
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-brand-blue dark:text-brand-blue-light mb-1">85%</div>
                    <div className="text-sm text-brand-gray dark:text-brand-white/70">Utilization Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-brand-blue dark:text-brand-blue-light mb-1">5 min</div>
                    <div className="text-sm text-brand-gray dark:text-brand-white/70">Setup Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-16 md:py-24 bg-brand-gray/5 dark:bg-brand-navy/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-4">
              Perfect For Every Type of Vehicle Owner
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Independent Dealers',
                description: 'Monetize slow-moving inventory and increase your lot turnover. Turn idle cars into cash flow while maintaining ownership.',
                benefits: [
                  'Reduce holding costs',
                  'Increase inventory turnover',
                  'Generate revenue from trade-ins',
                ],
                icon: '🏢',
              },
              {
                title: 'Dealerships',
                description: 'Scale your rental operations without the overhead. Perfect for franchise dealers and dealer groups looking to diversify revenue.',
                benefits: [
                  'Additional revenue stream',
                  'No operational overhead',
                  'Utilize underperforming inventory',
                ],
                icon: '🚗',
              },
              {
                title: 'Private Hosts',
                description: 'Own a vehicle you don\'t drive daily? Turn it into a passive income source. Perfect for individuals with extra vehicles.',
                benefits: [
                  'Earn from unused vehicles',
                  'Simple listing process',
                  'Full operational support',
                ],
                icon: '🏡',
              },
            ].map((audience, index) => (
              <div
                key={index}
                className="bg-white dark:bg-brand-navy-light rounded-xl p-8 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-all"
              >
                <div className="text-5xl mb-4">{audience.icon}</div>
                <h3 className="text-2xl font-bold text-brand-navy dark:text-brand-white mb-3">
                  {audience.title}
                </h3>
                <p className="text-brand-gray dark:text-brand-white/70 mb-6">
                  {audience.description}
                </p>
                <ul className="space-y-2">
                  {audience.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-brand-gray dark:text-brand-white/70">
                      <svg className="w-5 h-5 text-brand-green dark:text-brand-green-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy dark:text-brand-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-brand-gray dark:text-brand-white/70 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Account',
                description: 'Sign up as a dealer or private host. Complete your profile and verification in minutes.',
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'List Your Vehicles',
                description: 'Add photos, set pricing, and define availability. Our platform makes it quick and easy.',
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Start Earning',
                description: 'Once listed, renters can book your vehicles. You get paid automatically after each rental.',
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white dark:bg-brand-navy-light rounded-xl p-8 shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-all h-full">
                  <div className="text-brand-blue/20 dark:text-brand-blue/30 text-8xl font-bold absolute top-4 right-4">
                    {step.step}
                  </div>
                  <div className="text-brand-blue dark:text-brand-blue-light mb-6 relative z-10">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-brand-navy dark:text-brand-white mb-3 relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-brand-gray dark:text-brand-white/70 relative z-10">
                    {step.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-0">
                    <svg className="w-8 h-8 text-brand-blue/30 dark:text-brand-blue/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-brand-blue to-brand-green dark:from-brand-navy dark:to-brand-navy-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Turn Your Idle Vehicles Into Income?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join hundreds of dealers and private hosts earning passive revenue on Carsera. 
            No upfront costs. No commitments. Just results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?redirect=/dealer"
              className="px-8 py-4 bg-white text-brand-blue rounded-lg font-semibold text-lg hover:bg-brand-gray/10 transition-colors shadow-xl"
            >
              Get Started Free
            </Link>
            <Link
              href="/dealer-agreement"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-lg font-semibold text-lg hover:bg-white/20 transition-colors"
            >
              View Terms
            </Link>
          </div>
          <p className="text-white/70 text-sm mt-6">
            ✓ Free to list &bull; ✓ No monthly fees &bull; ✓ Get paid automatically
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}