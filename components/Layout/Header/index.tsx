'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/Theme/ThemeToggle'

interface HeaderProps {
  user?: {
    user_metadata?: {
      role?: string
    }
  } | null
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-brand-navy shadow-sm dark:shadow-brand-navy/30 border-b border-brand-white dark:border-brand-navy/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-brand-blue dark:text-brand-blue-light">
            Carsera
          </Link>
          <nav className="space-x-4 flex items-center">
            <ThemeToggle />
            {user ? (
              <Link
                href={user.user_metadata?.role === 'dealer' ? '/dealer' : '/renter'}
                className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="text-brand-navy dark:text-brand-white hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="px-4 py-2 rounded-lg hover:opacity-90 transition-all font-semibold shadow-lg text-white dark:text-white border-2 bg-brand-blue dark:bg-brand-blue-light border-brand-blue dark:border-brand-blue-light"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}