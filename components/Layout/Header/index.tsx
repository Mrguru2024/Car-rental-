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
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
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
    if (profile.role === 'admin') {
      return '/admin'
    }
    return '/onboarding'
  }

  return (
    <header className="bg-white dark:bg-brand-navy shadow-sm dark:shadow-brand-navy/30 border-b border-brand-white dark:border-brand-navy/50 h-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center w-full h-full">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center h-full">
              <Image
                src={logoSrc}
                alt="Carsera Logo"
                width={400}
                height={120}
                className="h-14 w-auto"
                priority
              />
            </Link>
          </div>
          <div className="flex-shrink-0">
            <nav className="flex items-center gap-3 sm:gap-4">
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
                        className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors text-sm sm:text-base whitespace-nowrap"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors text-sm sm:text-base whitespace-nowrap"
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
                      className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors text-sm sm:text-base whitespace-nowrap"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth"
                      className="px-3 sm:px-4 py-2 rounded-lg hover:opacity-90 transition-all font-semibold shadow-lg text-white dark:text-white border-2 bg-brand-blue dark:bg-brand-blue-light border-brand-blue dark:border-brand-blue-light text-sm sm:text-base whitespace-nowrap"
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