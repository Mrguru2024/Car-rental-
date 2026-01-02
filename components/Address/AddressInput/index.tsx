'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    google: any
  }
}

interface AddressInputProps {
  readonly id: string
  readonly name: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  readonly required?: boolean
  readonly rows?: number
  readonly className?: string
  readonly label?: string
  readonly helpText?: string
}

export default function AddressInput({
  id,
  name,
  value,
  onChange,
  placeholder = 'Enter address',
  required = false,
  rows = 1,
  className = '',
  label,
  helpText,
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const element = rows > 1 ? textareaRef.current : inputRef.current
    if (!element) return

    // Check if Google Places API is already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true)
      initializeAutocomplete(element)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      console.warn('Google Places API key not found. Address autocomplete will not work.')
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true)
          clearInterval(checkInterval)
          initializeAutocomplete(element)
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }

    // Load Google Places API script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.maps?.places) {
        setIsLoaded(true)
        initializeAutocomplete(element)
      }
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup: remove autocomplete listener
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const initializeAutocomplete = (element: HTMLInputElement | HTMLTextAreaElement) => {
    if (!element || !window.google?.maps?.places || autocompleteRef.current) return

    const autocomplete = new window.google.maps.places.Autocomplete(element, {
      types: ['address'],
      fields: ['formatted_address', 'geometry', 'address_components'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.formatted_address) {
        onChange(place.formatted_address)
      }
    })

    autocompleteRef.current = autocomplete
  }

  // Re-initialize when element becomes available and API is loaded
  useEffect(() => {
    const element = rows > 1 ? textareaRef.current : inputRef.current
    if (isLoaded && element && !autocompleteRef.current) {
      initializeAutocomplete(element)
    }
  }, [isLoaded, rows, onChange])

  const baseClassName = `w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 ${className}`

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {rows > 1 ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          ref={textareaRef}
          className={`${baseClassName} resize-none`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          ref={inputRef}
          className={baseClassName}
        />
      )}
      {helpText && <p className="mt-1 text-xs text-brand-gray dark:text-brand-white/70">{helpText}</p>}
    </div>
  )
}
