import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Carsera Privacy Policy - Learn how we collect, use, and protect your personal information and location data.',
}

export default async function PrivacyPolicyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-brand-navy dark:text-brand-white mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              1. Introduction
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Carsera ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our car rental platform, including our website, mobile application, and related services (collectively, the "Service").
            </p>
            <p className="text-brand-gray dark:text-brand-white/70">
              By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              2. Information We Collect
            </h2>
            
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              2.1 Personal Information
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Name, email address, phone number, and mailing address</li>
              <li>Driver's license number, state, and expiration date</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Profile information and preferences</li>
              <li>Vehicle listing information (for dealers/hosts)</li>
              <li>Booking and rental history</li>
              <li>Communications with us or other users</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              2.2 Location Information
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>We collect precise location data when you:</strong>
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Enable location services to search for nearby vehicles</li>
              <li>List a vehicle with a specific location</li>
              <li>Use features that require location access</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Location data is used solely to:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Provide nearby vehicle search functionality</li>
              <li>Display vehicle locations on maps</li>
              <li>Calculate distances between users and vehicles</li>
              <li>Improve our services and user experience</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              <strong>You can control location access through your device settings.</strong> Disabling location services may limit certain features of the Service.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              2.3 Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Log files and analytics data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Verify user identity and prevent fraud</li>
              <li>Send administrative information and updates</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Personalize your experience and provide relevant content</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations and enforce our agreements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              4. Information Sharing and Disclosure
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            
            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              4.1 Service Providers
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We share information with third-party service providers who perform services on our behalf, including:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Payment processing (Stripe)</li>
              <li>Cloud hosting and storage (Supabase)</li>
              <li>Analytics and performance monitoring</li>
              <li>Email and communication services</li>
              <li>Geolocation services (OpenCage Data)</li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              4.2 Between Users
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              When you book a vehicle, we share necessary information between renters and dealers/hosts to facilitate the rental, including names, contact information, and booking details. Vehicle locations are shared to enable bookings.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              4.3 Legal Requirements
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We may disclose information if required by law, court order, or government regulation, or to protect our rights, property, or safety, or that of our users or others.
            </p>

            <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 mt-6">
              4.4 Business Transfers
            </h3>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              5. Data Security
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We implement appropriate technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security assessments and updates</li>
              <li>Compliance with industry security standards</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              6. Your Rights and Choices
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your information (subject to legal obligations)</li>
              <li><strong>Opt-out:</strong> Opt out of certain communications and data processing</li>
              <li><strong>Location Controls:</strong> Disable location services through your device settings</li>
              <li><strong>Account Deletion:</strong> Delete your account through account settings</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              To exercise these rights, contact us at <a href="mailto:privacy@carsera.com" className="text-brand-blue dark:text-brand-blue-light hover:underline">privacy@carsera.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              7. Data Retention
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law:
            </p>
            <ul className="list-disc pl-6 text-brand-gray dark:text-brand-white/70 mb-4 space-y-2">
              <li><strong>Account Data:</strong> Retained while your account is active and for 7 years after account closure for legal and tax purposes</li>
              <li><strong>Booking Records:</strong> Retained for 7 years for tax and legal compliance</li>
              <li><strong>Payment Records:</strong> Retained for 7 years as required by financial regulations</li>
              <li><strong>Verification Documents:</strong> Retained for 3 years after account closure</li>
              <li><strong>Audit Logs:</strong> Retained for 7 years for security and compliance purposes</li>
              <li><strong>Session Data:</strong> Automatically deleted after 90 days of inactivity</li>
            </ul>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              You can request deletion of your data at any time, subject to legal retention requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. By using the Service, you consent to the transfer of your information to these countries.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              10. Changes to This Privacy Policy
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy dark:text-brand-white mb-4">
              11. Contact Us
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <div className="bg-brand-gray/10 dark:bg-brand-navy/50 rounded-lg p-4">
              <p className="text-brand-navy dark:text-brand-white font-semibold mb-2">Carsera</p>
              <p className="text-brand-gray dark:text-brand-white/70">Email: <a href="mailto:privacy@carsera.com" className="text-brand-blue dark:text-brand-blue-light hover:underline">privacy@carsera.com</a></p>
              <p className="text-brand-gray dark:text-brand-white/70">Support: <a href="mailto:support@carsera.com" className="text-brand-blue dark:text-brand-blue-light hover:underline">support@carsera.com</a></p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
