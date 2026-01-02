'use client'

import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from '@/components/Theme/ThemeToggle'
import { useTheme } from '@/lib/contexts/ThemeContext'

interface HeaderProps {
  user?: {
    user_metadata?: {
      role?: string
    }
  } | null
}

export default function Header({ user }: HeaderProps) {
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' 
    ? '/media/images/2.svg' 
    : '/media/images/Untitled design.svg'

  return (
    <header className="bg-white dark:bg-brand-navy shadow-sm dark:shadow-brand-navy/30 border-b border-brand-white dark:border-brand-navy/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center w-full">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src={logoSrc}
                alt="Carsera Logo"
                width={400}
                height={120}
                className="h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32 w-auto"
                priority
              />
            </Link>
          </div>
          <div className="flex-shrink-0">
            <nav className="flex items-center gap-3 sm:gap-4">
              <ThemeToggle />
              {user ? (
                <Link
                  href={user.user_metadata?.role === 'dealer' ? '/dealer' : '/renter'}
                  className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors text-sm sm:text-base whitespace-nowrap"
                >
                  Dashboard
                </Link>
              ) : (
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
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}