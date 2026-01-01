import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Drivana Terms of Service - Read our terms and conditions for using the car rental platform.',
}

export default async function TermsOfServicePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={user} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-brand-navy dark:text-brand-white mb-8">
          Terms of Service
        </h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              By accessing or using Drivana ("we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not access the Service.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              These Terms apply to all users of the Service, including renters, dealers, hosts, and visitors. Additional terms may apply to specific features or services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              2. Description of Service
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Drivana is a platform that connects vehicle owners (dealers and private hosts) with renters seeking to rent vehicles. We facilitate transactions but are not a party to rental agreements between users. We are not a rental car company, dealer, or insurance provider.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              3. User Accounts and Eligibility
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              3.1 Eligibility
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You must be at least 18 years old and have a valid driver's license to use the Service. By creating an account, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>You are of legal age to enter into binding contracts</li>
              <li>You have a valid driver's license in good standing</li>
              <li>All information you provide is accurate and current</li>
              <li>You will maintain the security of your account credentials</li>
              <li>You will comply with all applicable laws and regulations</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              3.2 Account Responsibility
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other breach of security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              4. User Conduct
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Post false, misleading, or fraudulent information</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or store personal data about other users without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              5. Vehicle Listings and Rentals
            </h2>
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              5.1 Vehicle Listings
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Dealers and hosts are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Accurate vehicle descriptions and information</li>
              <li>Vehicle condition and safety</li>
              <li>Compliance with all applicable laws and regulations</li>
              <li>Maintaining valid insurance coverage</li>
              <li>Vehicle availability and delivery</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              5.2 Rental Agreements
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Each rental creates a direct contract between the renter and the vehicle owner. Drivana is not a party to these agreements. We facilitate the transaction but are not responsible for:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Vehicle condition or performance</li>
              <li>Rental terms and conditions</li>
              <li>Disputes between users</li>
              <li>Damage, loss, or theft of vehicles</li>
              <li>Insurance claims or coverage</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              5.3 Renter Responsibilities
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Renters agree to:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Use vehicles in a safe and lawful manner</li>
              <li>Return vehicles in the same condition (normal wear and tear excepted)</li>
              <li>Comply with mileage limits and rental terms</li>
              <li>Report any damage or issues immediately</li>
              <li>Pay all fees and charges as agreed</li>
              <li>Maintain valid insurance coverage as required</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              6. Payments and Fees
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              All payments are processed through Stripe. You agree to:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Provide accurate payment information</li>
              <li>Authorize charges for rentals and fees</li>
              <li>Pay all applicable taxes and fees</li>
              <li>Comply with Stripe's terms of service</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Drivana charges a service fee on each transaction. Fees are clearly disclosed before booking. All fees are non-refundable except as required by law or as specified in our cancellation policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              7. Cancellations and Refunds
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Cancellation policies vary by vehicle and are set by the vehicle owner. Cancellation terms are displayed at the time of booking. Refunds, if applicable, will be processed according to the cancellation policy and may take 5-10 business days.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Drivana reserves the right to cancel bookings in cases of fraud, safety concerns, or violations of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              8. Insurance and Liability
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>Vehicle owners are required to maintain valid insurance coverage.</strong> Renters are responsible for their own insurance and may be required to provide proof of insurance.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>DRIVANA IS NOT AN INSURANCE PROVIDER.</strong> We do not provide insurance coverage. Users are solely responsible for obtaining appropriate insurance coverage.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              To the maximum extent permitted by law, Drivana disclaims all liability for:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Vehicle damage, loss, or theft</li>
              <li>Personal injury or property damage</li>
              <li>Accidents or incidents during rentals</li>
              <li>Insurance claims or coverage disputes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              9. Disclaimers and Limitation of Liability
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. DRIVANA DISCLAIMS ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DRIVANA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Our total liability to you for all claims shall not exceed the amount you paid to us in the 12 months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              10. Indemnification
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You agree to indemnify, defend, and hold harmless Drivana, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your vehicle listings or rentals</li>
              <li>Any damage or injury caused by vehicles you list or rent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              11. Intellectual Property
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              The Service and its content, features, and functionality are owned by Drivana and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              12. Termination
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including violation of these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You may terminate your account at any time through account settings or by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              13. Dispute Resolution
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>Binding Arbitration:</strong> Any dispute arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>Class Action Waiver:</strong> You agree to resolve disputes individually and waive any right to participate in class actions or consolidated proceedings.
            </p>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>Governing Law:</strong> These Terms shall be governed by the laws of the State of Georgia, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              14. Changes to Terms
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              15. Contact Information
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              If you have questions about these Terms, please contact us at:
            </p>
            <div className="bg-brand-gray/10 dark:bg-brand-navy/50 rounded-lg p-4">
              <p className="text-brand-navy dark:text-brand-white font-semibold mb-2">Drivana</p>
              <p className="text-brand-gray dark:text-brand-white/70">Email: <a href="mailto:legal@drivana.com" className="text-brand-blue dark:text-brand-blue-light hover:underline">legal@drivana.com</a></p>
              <p className="text-brand-gray dark:text-brand-white/70">Support: <a href="mailto:support@drivana.com" className="text-brand-blue dark:text-brand-blue-light hover:underline">support@drivana.com</a></p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
