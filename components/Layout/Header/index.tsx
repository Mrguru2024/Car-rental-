'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/Theme/ThemeToggle'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const logoSrc = resolvedTheme === 'dark' 
    ? '/media/images/2.svg' 
    : '/media/images/Untitled design.svg'

  useEffect(() => {
    // Get user and profile
    const getUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', authUser.id)
            .maybeSingle()
          
          setProfile(userProfile)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    getUserData()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUserData()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    // Sign out and redirect immediately
    supabase.auth.signOut().catch(console.error)
    // Use window.location for instant redirect
    window.location.href = '/'
  }

  const getDashboardLink = () => {
    if (!profile) {
      return '/onboarding'
    }
    if (profile.role === 'dealer' || profile.role === 'private_host') {
      return '/dealer'
    }
    if (profile.role === 'renter') {
      return '/renter'
    }
    if (profile.role === 'admin' || profile.role === 'prime_admin' || profile.role === 'super_admin') {
      return '/admin'
    }
    return '/onboarding'
  }

  return (
    <header className="bg-white dark:bg-brand-navy shadow-sm dark:shadow-brand-navy/30 border-b border-brand-white dark:border-brand-navy/50 h-16 xs:h-20">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 h-full">
        <div className="flex justify-between items-center w-full h-full">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center h-full">
              <Image
                src={logoSrc}
                alt="Carsera Logo"
                width={400}
                height={120}
                className="h-10 xs:h-12 sm:h-14 w-auto"
                priority
              />
            </Link>
          </div>
          <div className="flex-shrink-0">
            <nav className="flex items-center gap-2 xs:gap-3 sm:gap-4 lg:gap-6">
              <ThemeToggle />
              {(() => {
                if (loading) {
                  return null
                }
                if (user) {
                  return (
                    <>
                      <Link
                        href={getDashboardLink()}
                        className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors text-xs xs:text-sm sm:text-base whitespace-nowrap px-2 py-1 rounded hover:bg-brand-white/10 dark:hover:bg-brand-navy-light/10"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors text-xs xs:text-sm sm:text-base whitespace-nowrap px-2 py-1 rounded hover:bg-brand-white/10 dark:hover:bg-brand-navy-light/10"
                      >
                        Sign Out
                      </button>
                    </>
                  )
                }
                return (
                  <>
                    <Link
                      href="/auth"
                      className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors text-xs xs:text-sm sm:text-base whitespace-nowrap px-2 py-1 rounded hover:bg-brand-white/10 dark:hover:bg-brand-navy-light/10"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth"
                      className="px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 rounded-lg hover:opacity-90 transition-all font-semibold shadow-lg text-white dark:text-white border-2 bg-brand-blue dark:bg-brand-blue-light border-brand-blue dark:border-brand-blue-light text-xs xs:text-sm sm:text-base whitespace-nowrap"
                    >
                      Get Started
                    </Link>
                  </>
                )
              })()}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}