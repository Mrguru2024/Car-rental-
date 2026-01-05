'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function BlogSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    params.delete('page') // Reset to page 1 on search

    const timeoutId = setTimeout(() => {
      router.push(`/blog?${params.toString()}`)
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [search, router, searchParams])

  return (
    <div className="relative">
      <div
        className={`relative flex items-center gap-3 px-4 py-3 bg-white dark:bg-brand-navy border-2 rounded-xl transition-all duration-300 ${
          isFocused
            ? 'border-brand-blue dark:border-brand-blue-light shadow-lg shadow-brand-blue/10'
            : 'border-brand-gray/20 dark:border-brand-navy/50'
        }`}
      >
        <svg
          className={`w-5 h-5 transition-colors duration-300 ${
            isFocused
              ? 'text-brand-blue dark:text-brand-blue-light'
              : 'text-brand-gray dark:text-brand-white/50'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search blog posts..."
          className="flex-1 bg-transparent text-brand-navy dark:text-brand-white placeholder-brand-gray/50 dark:placeholder-brand-white/30 focus:outline-none text-base"
        />
        {search && (
          <button
            onClick={() => {
              setSearch('')
              inputRef.current?.focus()
            }}
            className="p-1 rounded-full hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors"
          >
            <svg
              className="w-5 h-5 text-brand-gray dark:text-brand-white/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
