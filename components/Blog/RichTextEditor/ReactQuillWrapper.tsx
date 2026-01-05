'use client'

import { ComponentType, useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'

// Create a wrapper that properly handles ReactQuill
// Using a simple dynamic import to avoid SSR issues
const ReactQuill = dynamic(
  () => import('react-quill'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="text-brand-gray dark:text-brand-white/70">Loading editor...</div>
      </div>
    )
  }
) as ComponentType<any>

interface ReactQuillWrapperProps {
  value: string
  onChange: (value: string) => void
  modules?: any
  formats?: string[]
  placeholder?: string
  theme?: string
}

// Wrapper component that handles ReactQuill with error boundary
export default function ReactQuillWrapper({
  value,
  onChange,
  modules,
  formats,
  placeholder,
  theme = 'snow',
}: ReactQuillWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    
    // Suppress findDOMNode errors in console
    const originalError = console.error
    console.error = (...args: any[]) => {
      const message = String(args[0] || '')
      if (
        message.includes('findDOMNode') ||
        message.includes('Warning: findDOMNode') ||
        message.includes('react_dom_1.default.findDOMNode')
      ) {
        // Suppress findDOMNode errors - they're warnings, not breaking errors
        return
      }
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="text-brand-gray dark:text-brand-white/70">Loading editor...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[400px] border border-red-200 dark:border-red-800 rounded-lg p-4 flex flex-col items-center justify-center">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p className="font-medium mb-2">Editor failed to load</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setMounted(false)
              setTimeout(() => setMounted(true), 100)
            }}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <ReactQuill
        theme={theme}
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  )
}
