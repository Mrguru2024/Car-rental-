'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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
  const [error, setError] = useState<string | null>(null)

  // Initialize autocomplete callback
  const initializeAutocomplete = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      // Google Places Autocomplete only works with HTMLInputElement, not HTMLTextAreaElement
      // Skip autocomplete initialization for textarea elements
      if (!element || !(element instanceof HTMLInputElement)) {
        return
      }
      
      if (!window.google?.maps?.places || autocompleteRef.current) return

      try {
        // Google Places Autocomplete only works with input elements
        const autocomplete = new window.google.maps.places.Autocomplete(element, {
          types: ['address'],
          fields: [
            'formatted_address',
            'geometry',
            'address_components',
            'place_id',
            'types',
            'name',
          ],
          componentRestrictions: { country: [] }, // Allow all countries
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()

          // Validate that we have a proper address
          if (!place.formatted_address) {
            setError('Please select a valid address from the suggestions')
            return
          }

          // Check if it's actually an address type (not just a business name)
          const addressTypes = place.types || []
          const isValidAddress =
            addressTypes.includes('street_address') ||
            addressTypes.includes('premise') ||
            addressTypes.includes('subpremise') ||
            addressTypes.includes('route') ||
            addressTypes.includes('establishment') // Allow establishments as they have addresses

          if (!isValidAddress && addressTypes.length > 0) {
            // If it's a valid place but not a standard address, still allow it
            // but log for debugging
            console.log('Selected place type:', addressTypes)
          }

          setError(null)
          onChange(place.formatted_address)
        })

        // Handle autocomplete errors
        autocomplete.addListener('error', (error: any) => {
          console.error('Google Places Autocomplete error:', error)
          setError('Address validation error. Please try again.')
        })

        autocompleteRef.current = autocomplete
      } catch (err) {
        console.error('Error initializing Google Places Autocomplete:', err)
        setError('Failed to initialize address autocomplete')
      }
    },
    [onChange]
  )

  // Load Google Places API script
  useEffect(() => {
    // Google Places Autocomplete only works with input elements, not textarea
    // Skip autocomplete initialization if using textarea (rows > 1)
    if (rows > 1) {
      return
    }

    // Helper to get the current element (always fresh from refs)
    const getElement = () => inputRef.current

    const element = getElement()
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
      setError('Address autocomplete is not available')
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      // Wait for script to load
      let attempts = 0
      const maxAttempts = 50 // 5 seconds max wait time
      const checkInterval = setInterval(() => {
        attempts++
        // Get fresh element reference inside the interval
        const currentElement = getElement()
        if (window.google?.maps?.places && currentElement) {
          setIsLoaded(true)
          clearInterval(checkInterval)
          initializeAutocomplete(currentElement)
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          setError('Failed to load Google Places API')
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
      // Get fresh element reference in onload
      const currentElement = getElement()
      if (window.google?.maps?.places && currentElement) {
        setIsLoaded(true)
        initializeAutocomplete(currentElement)
      } else {
        setError('Failed to load Google Places API')
      }
    }
    script.onerror = () => {
      setError('Failed to load Google Places API. Please check your API key.')
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup: remove autocomplete listener
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [rows, initializeAutocomplete])

  // Re-initialize when element becomes available and API is loaded
  useEffect(() => {
    // Skip autocomplete initialization if using textarea (rows > 1)
    if (rows > 1) {
      return
    }

    const element = inputRef.current
    if (isLoaded && element && !autocompleteRef.current) {
      initializeAutocomplete(element)
    }
  }, [isLoaded, rows, initializeAutocomplete])

  const baseClassName = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white placeholder:text-brand-gray dark:placeholder:text-brand-gray/70 ${
    error
      ? 'border-red-500 dark:border-red-500'
      : 'border-brand-gray dark:border-brand-navy'
  } ${className}`

  // Google Places Autocomplete works with both input and textarea elements
  const inputElement = rows > 1 ? (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={(e) => {
        setError(null)
        onChange(e.target.value)
      }}
      placeholder={placeholder}
      required={required}
      rows={rows}
      ref={textareaRef}
      className={`${baseClassName} resize-none`}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
    />
  ) : (
    <input
      id={id}
      name={name}
      type="text"
      value={value}
      onChange={(e) => {
        setError(null)
        onChange(e.target.value)
      }}
      placeholder={placeholder}
      required={required}
      ref={inputRef}
      className={baseClassName}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
    />
  )

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {inputElement}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 text-xs text-brand-gray dark:text-brand-white/70">
          {helpText}
        </p>
      )}
    </div>
  )
}
