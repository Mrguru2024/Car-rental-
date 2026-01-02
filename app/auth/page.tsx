'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import Header from '@/components/Layout/Header'

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    // Check for error parameter from OAuth callback
    const error = searchParams.get('error')
    if (error) {
      showToast(decodeURIComponent(error), 'error')
      // Clean up URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      window.history.replaceState({}, '', newUrl.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]) // Only depend on searchParams for error checking

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const redirect = searchParams.get('redirect') || '/onboarding'
        router.push(redirect)
      }
    })
  }, [router, searchParams, supabase])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validation
    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      // Check if email confirmation is required
      if (data.user && !data.session) {
        showToast('Please check your email to confirm your account', 'success')
      } else {
        // User is signed in automatically (if email confirmation is disabled)
        showToast('Account created successfully!', 'success')
        router.push('/onboarding')
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to create account', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      showToast('Signed in successfully!', 'success')
      
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('user_id', data.user.id)
        .maybeSingle()

      // If profile exists, redirect based on role and verification status
      // Note: Errors (404 from RLS or missing record) are ignored - user needs onboarding
      if (profile) {
        // User has profile, redirect based on role and verification status
        if (profile.role === 'renter') {
          router.push(profile.verification_status === 'approved' ? '/renter' : '/renter/verification')
        } else if (profile.role === 'dealer' || profile.role === 'private_host') {
          router.push(profile.verification_status === 'approved' ? '/dealer' : '/dealer/verification')
        } else if (profile.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/onboarding')
        }
      } else {
        // No profile, redirect to onboarding
        router.push('/onboarding')
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to sign in', 'error')
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

      if (error) {
        // Handle specific OAuth errors gracefully
        if (error.message.includes('provider') || error.message.includes('not enabled')) {
          showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign in is not configured yet. Please use email/password to sign in.`, 'error')
        } else {
          showToast(error.message || `Failed to sign in with ${provider}`, 'error')
        }
        setLoading(false)
        return
      }
      // If successful, user will be redirected, so don't set loading to false
    } catch (error: any) {
      // Catch any unexpected errors
      const errorMessage = error.message || `Failed to sign in with ${provider}`
      if (errorMessage.includes('provider') || errorMessage.includes('not enabled')) {
        showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign in is not configured yet. Please use email/password to sign in.`, 'error')
      } else {
        showToast(errorMessage, 'error')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-8 border border-brand-white dark:border-brand-navy/50">
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-8 text-center">
            {activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
          </h1>

          {/* Tab Switcher */}
          <div className="flex mb-6 bg-brand-gray/10 dark:bg-brand-navy rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin')
                setEmail('')
                setPassword('')
                setConfirmPassword('')
              }}
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
              onClick={() => {
                setActiveTab('signup')
                setEmail('')
                setPassword('')
                setConfirmPassword('')
              }}
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
                Or continue with email
              </span>
            </div>
          </div>

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
              <div>
                <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="signin-email" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Email Address
                </label>
                <input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
              <div>
                <label htmlFor="signin-password" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-brand-green dark:bg-brand-green text-white dark:text-white rounded-lg hover:bg-brand-green-dark dark:hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-brand-gray dark:text-brand-white/70">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-brand-blue dark:text-brand-blue-light hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-brand-blue dark:text-brand-blue-light hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-brand-gray dark:text-brand-white/70">Loading...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}