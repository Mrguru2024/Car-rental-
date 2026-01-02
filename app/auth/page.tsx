'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import Header from '@/components/Layout/Header'
import { logAuthEvent } from '@/lib/security/auditLog'
import { checkSuspiciousLogin } from '@/lib/security/securityMonitoring'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const redirect = searchParams.get('redirect') || '/onboarding'
        router.push(redirect)
      }
    })
  }, [router, searchParams, supabase])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      showToast('Check your email for the magic link!', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to send magic link', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms',
        },
      })

      if (error) throw error

      showToast('Check your phone for the verification code!', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to send SMS code', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      showToast(error.message || `Failed to sign in with ${provider}`, 'error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header user={null} />

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-8 border border-brand-white dark:border-brand-navy/50">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-8 text-center">
            {activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
          </h1>

          {/* Tab Switcher */}
          <div className="flex mb-6 bg-brand-gray/10 dark:bg-brand-navy rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'signin'
                  ? 'bg-brand-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white shadow-sm'
                  : 'text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'bg-brand-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white shadow-sm'
                  : 'text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="w-full px-4 py-3 bg-white dark:bg-brand-navy border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('apple')}
              disabled={loading}
              className="w-full px-4 py-3 bg-white dark:bg-brand-navy border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with Apple
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-gray/20 dark:border-brand-navy/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-brand-navy-light text-brand-gray dark:text-brand-white/70">
                Or continue with
              </span>
            </div>
          </div>

          {/* Auth Method Toggle */}
          <div className="flex mb-4 bg-brand-gray/10 dark:bg-brand-navy rounded-lg p-1">
            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMethod === 'email'
                  ? 'bg-brand-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white shadow-sm'
                  : 'text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('phone')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMethod === 'phone'
                  ? 'bg-brand-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white shadow-sm'
                  : 'text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white'
              }`}
            >
              Phone
            </button>
          </div>

          {/* Email Form */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}

          {/* Phone Form */}
          {authMethod === 'phone' && (
            <form onSubmit={handlePhoneSignIn} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send SMS Code'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-brand-gray dark:text-brand-white/70">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
