'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import Header from '@/components/Layout/Header'

type Role = 'renter' | 'dealer' | 'private_host'
type Step = 'role' | 'profile' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('role')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
  })

  useEffect(() => {
    checkExistingProfile()
  }, [])

  const checkExistingProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('user_id', user.id)
        .maybeSingle()

      // If profile exists and no error, redirect based on role and verification status
      // Note: Errors (404 from RLS or missing record) are ignored - user needs onboarding
      if (profile) {
        // User already has a profile, redirect to appropriate dashboard
        if (profile.role === 'renter') {
          if (profile.verification_status === 'approved') {
            router.push('/renter')
          } else {
            router.push('/renter/verification')
          }
        } else if (profile.role === 'dealer' || profile.role === 'private_host') {
          if (profile.verification_status === 'approved') {
            router.push('/dealer')
          } else {
            router.push('/dealer/verification')
          }
        } else if (profile.role === 'admin') {
          router.push('/admin')
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
  }

  const handleRoleContinue = () => {
    if (!selectedRole) {
      showToast('Please select a role to continue', 'error')
      return
    }
    setCurrentStep('profile')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth')
        return
      }

      // Create or update profile (user_id should be unique for upsert to work correctly)
      if (!selectedRole) {
        showToast('Please select a role', 'error')
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('profiles').upsert(
        {
          user_id: user.id,
          role: selectedRole,
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          verification_status: 'pending',
        },
        {
          onConflict: 'user_id',
        }
      )

      if (error) throw error

      showToast('Profile created successfully!', 'success')
      setCurrentStep('complete')

      // Redirect to verification after a short delay
      setTimeout(() => {
        if (selectedRole === 'renter') {
          router.push('/renter/verification')
        } else {
          router.push('/dealer/verification')
        }
      }, 2000)
    } catch (error: any) {
      showToast(error.message || 'Failed to create profile', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-white dark:bg-brand-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue dark:border-brand-blue-light mx-auto mb-4"></div>
          <p className="text-brand-navy dark:text-brand-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep === 'role'
                  ? 'bg-brand-blue dark:bg-brand-blue-light border-brand-blue dark:border-brand-blue-light text-white'
                  : 'bg-brand-green dark:bg-brand-green border-brand-green dark:border-brand-green text-white'
              }`}
            >
              {currentStep === 'role' ? '1' : '✓'}
            </div>
            <div
              className={`h-1 w-24 ${
                currentStep === 'profile' || currentStep === 'complete'
                  ? 'bg-brand-green dark:bg-brand-green'
                  : 'bg-brand-gray/20 dark:bg-brand-navy/50'
              }`}
            ></div>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep === 'profile'
                  ? 'bg-brand-blue dark:bg-brand-blue-light border-brand-blue dark:border-brand-blue-light text-white'
                  : currentStep === 'complete'
                  ? 'bg-brand-green dark:bg-brand-green border-brand-green dark:border-brand-green text-white'
                  : 'bg-transparent border-brand-gray/20 dark:border-brand-navy/50 text-brand-gray dark:text-brand-white/50'
              }`}
            >
              {currentStep === 'complete' ? '✓' : '2'}
            </div>
          </div>
          <div className="flex justify-center space-x-24">
            <span
              className={`text-sm font-medium ${
                currentStep === 'role'
                  ? 'text-brand-blue dark:text-brand-blue-light'
                  : 'text-brand-gray dark:text-brand-white/70'
              }`}
            >
              Choose Role
            </span>
            <span
              className={`text-sm font-medium ${
                currentStep === 'profile' || currentStep === 'complete'
                  ? 'text-brand-blue dark:text-brand-blue-light'
                  : 'text-brand-gray dark:text-brand-white/70'
              }`}
            >
              Profile Info
            </span>
          </div>
        </div>

        {/* Step 1: Role Selection */}
        {currentStep === 'role' && (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-lg dark:shadow-brand-navy/30 p-8 border border-brand-white dark:border-brand-navy/50">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
                Welcome to Carsera!
              </h1>
              <p className="text-brand-gray dark:text-brand-white/70">
                Let's get you started. First, tell us how you'd like to use Carsera.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Renter Option */}
              <button
                onClick={() => handleRoleSelect('renter')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedRole === 'renter'
                    ? 'border-brand-blue dark:border-brand-blue-light bg-brand-blue/5 dark:bg-brand-blue/10 shadow-lg'
                    : 'border-brand-gray/20 dark:border-brand-navy/50 hover:border-brand-blue/50 dark:hover:border-brand-blue/50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedRole === 'renter'
                        ? 'bg-brand-blue dark:bg-brand-blue-light text-white'
                        : 'bg-brand-gray/10 dark:bg-brand-navy text-brand-gray dark:text-brand-white/70'
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-2">
                      I want to rent a car
                    </h3>
                    <p className="text-sm text-brand-gray dark:text-brand-white/70">
                      Find and book vehicles from local dealers and private owners. Perfect for
                      weekend trips, business travel, or when you need a temporary vehicle.
                    </p>
                  </div>
                  {selectedRole === 'renter' && (
                    <div className="flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-brand-green dark:text-brand-green-light"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>

              {/* Dealer/Private Host Option */}
              <button
                onClick={() => handleRoleSelect('dealer')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedRole === 'dealer' || selectedRole === 'private_host'
                    ? 'border-brand-blue dark:border-brand-blue-light bg-brand-blue/5 dark:bg-brand-blue/10 shadow-lg'
                    : 'border-brand-gray/20 dark:border-brand-navy/50 hover:border-brand-blue/50 dark:hover:border-brand-blue/50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedRole === 'dealer' || selectedRole === 'private_host'
                        ? 'bg-brand-blue dark:bg-brand-blue-light text-white'
                        : 'bg-brand-gray/10 dark:bg-brand-navy text-brand-gray dark:text-brand-white/70'
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-2">
                      I want to list my vehicles
                    </h3>
                    <p className="text-sm text-brand-gray dark:text-brand-white/70">
                      List your vehicles and earn passive income. Perfect for car dealers or
                      private owners with idle vehicles.
                    </p>
                  </div>
                  {(selectedRole === 'dealer' || selectedRole === 'private_host') && (
                    <div className="flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-brand-green dark:text-brand-green-light"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleRoleContinue}
                disabled={!selectedRole}
                className="px-8 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Profile Information */}
        {currentStep === 'profile' && (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-lg dark:shadow-brand-navy/30 p-8 border border-brand-white dark:border-brand-navy/50">
            <div className="mb-8">
              <button
                onClick={() => setCurrentStep('role')}
                className="flex items-center text-brand-gray dark:text-brand-white/70 hover:text-brand-blue dark:hover:text-brand-blue-light mb-4 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
                Tell us about yourself
              </h1>
              <p className="text-brand-gray dark:text-brand-white/70">
                We need a few details to set up your {selectedRole === 'renter' ? 'renter' : 'dealer'}{' '}
                profile.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70"
                />
                <p className="mt-1 text-xs text-brand-gray dark:text-brand-white/70">
                  We'll use this to contact you about bookings and important updates.
                </p>
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2"
                >
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main St, Atlanta, GA 30301"
                  rows={3}
                  className="w-full px-4 py-3 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 resize-none"
                />
                <p className="mt-1 text-xs text-brand-gray dark:text-brand-white/70">
                  {selectedRole === 'renter'
                    ? 'This helps us show you vehicles near you.'
                    : 'This helps renters find your vehicles.'}
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep('role')}
                  className="px-6 py-3 border border-brand-gray dark:border-brand-navy rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium text-brand-navy dark:text-brand-white"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      Continue to Verification
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-lg dark:shadow-brand-navy/30 p-8 border border-brand-white dark:border-brand-navy/50 text-center">
            <div className="w-16 h-16 bg-brand-green dark:bg-brand-green-light rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white mb-2">
              Profile Created!
            </h2>
            <p className="text-brand-gray dark:text-brand-white/70 mb-6">
              Redirecting you to verification...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue dark:border-brand-blue-light mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  )
}
