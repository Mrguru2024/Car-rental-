import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dealer Agreement & Policy',
  description: 'Carsera Dealer Agreement and Policy - Terms and conditions for dealers and hosts listing vehicles on the platform.',
}

export default async function DealerAgreementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-brand-navy dark:text-brand-white mb-8">
          Dealer Agreement & Policy
        </h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              By listing a vehicle on Carsera, you ("Dealer," "Host," or "you") agree to be bound by this Dealer Agreement & Policy ("Agreement"), our Terms of Service, and our Privacy Policy. This Agreement supplements and does not replace our Terms of Service.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              If you do not agree to this Agreement, you may not list vehicles on Carsera.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              2. Eligibility and Verification
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              2.1 Dealer Requirements
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              To list vehicles on Carsera, you must:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Be at least 18 years old</li>
              <li>Own or have legal authority to rent the vehicle(s)</li>
              <li>Have a valid driver's license</li>
              <li>Maintain valid insurance coverage as required by law</li>
              <li>Complete identity verification</li>
              <li>Provide accurate business information (for dealers)</li>
              <li>Comply with all applicable local, state, and federal laws</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              2.2 Verification Process
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Carsera requires verification of:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Identity (government-issued ID)</li>
              <li>Vehicle ownership or authorization</li>
              <li>Insurance coverage</li>
              <li>Business license (for commercial dealers)</li>
              <li>Vehicle registration and title</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Verification must be completed before your first listing goes live. We reserve the right to request additional documentation at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              3. Vehicle Listings
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              3.1 Listing Requirements
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              All vehicle listings must:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Accurately describe the vehicle's condition, features, and specifications</li>
              <li>Include clear, recent photos showing the vehicle's actual condition</li>
              <li>Disclose any damage, defects, or limitations</li>
              <li>Specify accurate location and availability</li>
              <li>Set reasonable and competitive pricing</li>
              <li>Include clear rental terms and policies</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              3.2 Prohibited Listings
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You may not list:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Vehicles you do not own or have authority to rent</li>
              <li>Stolen, salvaged, or unregistered vehicles</li>
              <li>Vehicles with outstanding liens (unless disclosed and permitted)</li>
              <li>Vehicles that are unsafe or not roadworthy</li>
              <li>Vehicles used for illegal purposes</li>
              <li>Vehicles with false or misleading information</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              3.3 Listing Modifications
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You may update listings at any time, but changes to active bookings require renter consent. Carsera reserves the right to edit, suspend, or remove listings that violate this Agreement or our policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              4. Vehicle Condition and Safety
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              4.1 Vehicle Maintenance
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Maintaining vehicles in safe, roadworthy condition</li>
              <li>Regular maintenance, inspections, and repairs</li>
              <li>Compliance with all safety and emissions standards</li>
              <li>Keeping vehicles clean and presentable</li>
              <li>Addressing any recalls or safety notices</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              4.2 Pre-Rental Inspection
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You must conduct a pre-rental inspection with the renter and document the vehicle's condition. Both parties should sign an inspection report noting any existing damage or issues.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              4.3 Post-Rental Inspection
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You must inspect the vehicle upon return and document any new damage or issues. Claims for damage must be reported within 24 hours of vehicle return.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              5. Insurance Requirements
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              5.1 Mandatory Insurance
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>You must maintain valid insurance coverage</strong> that:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Meets or exceeds state minimum requirements</li>
              <li>Covers commercial rental use (if applicable)</li>
              <li>Includes liability, collision, and comprehensive coverage</li>
              <li>Remains active throughout the rental period</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You must provide proof of insurance upon request. Failure to maintain valid insurance will result in immediate suspension of your listings.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              5.2 Insurance Claims
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You are responsible for filing insurance claims for vehicle damage. Carsera is not responsible for insurance coverage, claims, or disputes. You agree to cooperate with insurance investigations and provide necessary documentation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              6. Pricing and Payments
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              6.1 Pricing
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You set your own rental prices. Prices must be competitive and reasonable. Carsera reserves the right to reject or adjust prices that are unreasonably high or low.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              6.2 Payment Processing
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Payments are processed through Stripe. You will receive payment (minus Carsera's service fee) after the rental period begins. Payment schedules and fees are disclosed in your account settings.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              6.3 Service Fees
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Carsera charges a service fee on each completed rental. Fees are clearly disclosed and deducted from your payment. Service fees are non-refundable.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              6.4 Taxes
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You are responsible for collecting and remitting all applicable taxes, including sales tax, rental tax, and income tax. Carsera may assist with tax collection where required by law, but you remain ultimately responsible for tax compliance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              7. Cancellation and Refund Policy
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              7.1 Your Cancellation Policy
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You must set a clear cancellation policy for each vehicle. Options include:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li><strong>Flexible:</strong> Full refund if canceled 24+ hours before rental start</li>
              <li><strong>Moderate:</strong> Full refund if canceled 5+ days before rental start</li>
              <li><strong>Strict:</strong> 50% refund if canceled 7+ days before rental start</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You may not cancel confirmed bookings except in cases of emergency, safety concerns, or renter violations. Unjustified cancellations may result in penalties or account suspension.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              7.2 Renter Cancellations
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Renters may cancel according to your policy. Refunds are processed automatically according to your cancellation terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              8. Damage and Loss
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              8.1 Damage Claims
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You may file damage claims for damage beyond normal wear and tear. Claims must be:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Reported within 24 hours of vehicle return</li>
              <li>Supported by documentation (photos, inspection reports, estimates)</li>
              <li>Reasonable and justified</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Carsera may assist with dispute resolution, but you are responsible for pursuing claims through insurance or legal channels.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              8.2 Normal Wear and Tear
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Normal wear and tear includes minor scratches, dings, and interior wear consistent with normal use. You may not charge for normal wear and tear.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              9. Prohibited Activities
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Circumvent Carsera's payment system or fees</li>
              <li>Contact renters outside the platform to avoid fees</li>
              <li>Discriminate against renters based on protected characteristics</li>
              <li>Harass, abuse, or threaten renters</li>
              <li>Provide false or misleading information</li>
              <li>Use the platform for illegal activities</li>
              <li>Manipulate reviews or ratings</li>
              <li>List vehicles you do not own or have authority to rent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              10. Reviews and Ratings
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Renters may leave reviews and ratings after rentals. Reviews must be honest and based on actual experiences. You may respond to reviews but may not:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Offer incentives for positive reviews</li>
              <li>Threaten or retaliate against negative reviews</li>
              <li>Post false or defamatory reviews</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Carsera reserves the right to remove reviews that violate our policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              11. Termination
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Carsera may suspend or terminate your account and remove your listings if you:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Violate this Agreement or our Terms of Service</li>
              <li>Fail to maintain valid insurance</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Receive multiple complaints or negative reviews</li>
              <li>Fail to fulfill rental obligations</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You may terminate your account at any time, but you remain responsible for active bookings and any outstanding obligations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              12. Limitation of Liability
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CARSERA SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Vehicle damage, loss, or theft</li>
              <li>Personal injury or property damage</li>
              <li>Renter misconduct or violations</li>
              <li>Insurance claims or coverage disputes</li>
              <li>Lost revenue or business opportunities</li>
              <li>Technical issues or service interruptions</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Your use of Carsera is at your own risk. You are solely responsible for your vehicles, listings, and rentals.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              13. Indemnification
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You agree to indemnify, defend, and hold harmless Carsera, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Your vehicle listings or rentals</li>
              <li>Vehicle condition, safety, or performance</li>
              <li>Your violation of this Agreement</li>
              <li>Any damage or injury caused by your vehicles</li>
              <li>Insurance claims or disputes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              14. Changes to Agreement
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We may update this Agreement from time to time. Material changes will be notified via email or platform notification. Your continued use of Carsera after changes constitutes acceptance of the updated Agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              15. Contact Information
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              For questions about this Agreement, contact:
            </p>
            <div className="bg-brand-gray/10 dark:bg-brand-navy/50 rounded-lg p-4">
              <p className="text-brand-navy dark:text-brand-white font-semibold mb-2">Carsera Dealer Support</p>
              <p className="text-brand-gray dark:text-brand-white/70">Email: <a href="mailto:dealers@carsera.com" className="text-brand-blue dark:text-brand-blue-light hover:underline">dealers@carsera.com</a></p>
              <p className="text-brand-gray dark:text-brand-white/70">Support: <a href="mailto:support@carsera.com" className="text-brand-blue dark:text-brand-blue-light hover:underline">support@carsera.com</a></p>
            </div>
          </section>

          <div className="mt-12 p-6 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-lg border border-brand-blue/20 dark:border-brand-blue/30">
            <p className="text-brand-navy dark:text-brand-white font-semibold mb-2">
              By listing a vehicle on Carsera, you acknowledge that you have read, understood, and agree to be bound by this Dealer Agreement & Policy.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
