'use client'

import { useTheme } from '@/lib/contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="px-3 py-2 rounded-lg bg-brand-white dark:bg-brand-navy-light border border-brand-gray dark:border-brand-navy text-brand-navy dark:text-brand-white hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors"
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {theme === 'light' && '☀️'}
      {theme === 'dark' && '🌙'}
      {theme === 'system' && '💻'}
    </button>
  )
}