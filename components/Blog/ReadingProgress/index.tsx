'use client'

import { useEffect, useState } from 'react'

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const scrollableHeight = documentHeight - windowHeight
      const scrollProgress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, scrollProgress)))
    }

    window.addEventListener('scroll', updateProgress)
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-brand-gray/10 dark:bg-brand-navy/50 z-50">
      <div
        className="h-full bg-gradient-to-r from-brand-blue via-brand-green to-brand-blue transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
