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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
    // Check if user is already logged in (only run once on mount)
    let mounted = true
    let hasRedirected = false
    
    const checkUser = async () => {
      // Prevent redirect loop - if we're already on auth page with redirect param, don't redirect again
      const currentPath = window.location.pathname
      if (currentPath === '/auth' && searchParams.get('redirect')) {
        // User is on auth page with redirect - they need to log in, don't auto-redirect
        return
      }
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted || hasRedirected) return
      
      if (user) {
        hasRedirected = true
        
        // Check if user has a profile to determine redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, verification_status')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!mounted) return

        let redirectUrl = '/onboarding'
        if (profile) {
          // User has profile, redirect based on role
          if (profile.role === 'renter') {
            redirectUrl = profile.verification_status === 'approved' ? '/renter' : '/renter/verification'
          } else if (profile.role === 'dealer' || profile.role === 'private_host') {
            redirectUrl = profile.verification_status === 'approved' ? '/dealer' : '/dealer/verification'
          } else if (profile.role === 'admin') {
            redirectUrl = '/admin'
          }
        } else {
          // No profile, use redirect param or default to onboarding
          redirectUrl = searchParams.get('redirect') || '/onboarding'
        }
        
        // Use hard redirect to ensure middleware sees the session
        window.location.href = redirectUrl
      }
    }
    checkUser()
    
    return () => {
      mounted = false
    }
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
        // Wait a moment for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 100))
        // Use hard redirect to ensure middleware sees the new session
        window.location.href = '/onboarding'
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
      
      // Ensure session is established by getting it explicitly
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        showToast('Session not established. Please try again.', 'error')
        setLoading(false)
        return
      }
      
      // Wait a moment for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('user_id', data.user.id)
        .maybeSingle()

      // Determine redirect URL
      let redirectUrl = '/onboarding'
      if (profile) {
        // User has profile, redirect based on role and verification status
        if (profile.role === 'renter') {
          redirectUrl = profile.verification_status === 'approved' ? '/renter' : '/renter/verification'
        } else if (profile.role === 'dealer' || profile.role === 'private_host') {
          redirectUrl = profile.verification_status === 'approved' ? '/dealer' : '/dealer/verification'
        } else if (profile.role === 'admin') {
          redirectUrl = '/admin'
        }
      }

      // Use hard redirect to ensure middleware sees the new session
      window.location.href = redirectUrl
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
                setShowPassword(false)
                setShowConfirmPassword(false)
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
                setShowPassword(false)
                setShowConfirmPassword(false)
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
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 pr-10 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 pr-10 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
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
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-2 pr-10 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
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