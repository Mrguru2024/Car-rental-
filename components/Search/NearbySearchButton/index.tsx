'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast/ToastProvider'

interface NearbySearchButtonProps {
  onLocationFound?: (location: { lat: number; lng: number; address?: string }) => void
  inputId?: string // ID of the location input to update
}

export default function NearbySearchButton({ onLocationFound, inputId }: NearbySearchButtonProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setHasPermission(false)
      return
    }

    // Check permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setHasPermission(result.state === 'granted')
        result.onchange = () => {
          setHasPermission(result.state === 'granted')
        }
      })
    }
  }, [])

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error')
      return
    }

    setIsLoading(true)

    // Set a timeout to handle cases where geolocation takes too long
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      showToast('Location request is taking longer than expected. Please check your location settings or try again.', 'error')
    }, 15000) // 15 second overall timeout

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeoutId)
        const { latitude, longitude } = position.coords
        setHasPermission(true)

        try {
          // Reverse geocode to get address (with timeout)
          const geocodeController = new AbortController()
          const geocodeTimeout = setTimeout(() => geocodeController.abort(), 5000) // 5 second timeout for geocoding

          let address: string | undefined
          let cityName: string | undefined
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY || ''}&limit=1`,
              { signal: geocodeController.signal }
            )
            
            if (response.ok) {
              const data = await response.json()
              if (data.results && data.results.length > 0) {
                const result = data.results[0]
                const components = result.components || {}
                
                // Extract city name - try different possible fields
                cityName = components.city || 
                          components.town || 
                          components.village || 
                          components.municipality ||
                          components.county ||
                          components.state_district ||
                          ''
                
                // Add state code if available for better clarity (e.g., "Atlanta, GA")
                const stateCode = components.state_code || components.state
                if (cityName && stateCode) {
                  address = `${cityName}, ${stateCode}`
                } else if (cityName) {
                  address = cityName
                } else {
                  // Fallback to formatted address if city extraction fails
                  address = result.formatted
                }
              }
            }
            clearTimeout(geocodeTimeout)
          } catch (geocodeError: any) {
            clearTimeout(geocodeTimeout)
            if (geocodeError.name !== 'AbortError') {
              console.error('Geocoding error:', geocodeError)
            }
            // Continue without address if geocoding fails
          }

          // Use city name if available, otherwise use full address or coordinates
          const displayLocation = address || cityName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          
          const location = {
            lat: latitude,
            lng: longitude,
            address: displayLocation,
          }

          setUserLocation(location)
          
          // Update the location input field if ID provided
          if (inputId) {
            const input = document.getElementById(inputId) as HTMLInputElement
            if (input && address) {
              input.value = address
            } else if (input) {
              input.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            }
          }
          
          if (onLocationFound) {
            onLocationFound(location)
          }

          // Update URL with location
          const params = new URLSearchParams(window.location.search)
          params.set('lat', latitude.toString())
          params.set('lng', longitude.toString())
          if (address) {
            params.set('location', address)
          } else {
            params.set('location', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
          }
          
          // Navigate to listings with location params
          router.push(`/listings?${params.toString()}`)

          showToast('Location found! Searching nearby vehicles...', 'success')
        } catch (error) {
          console.error('Location processing error:', error)
          // Still use coordinates even if processing fails
          const location = {
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          }
          setUserLocation(location)
          
          if (inputId) {
            const input = document.getElementById(inputId) as HTMLInputElement
            if (input) {
              input.value = location.address
            }
          }
          
          if (onLocationFound) {
            onLocationFound(location)
          }
          
          // Still navigate even without geocoding
          const params = new URLSearchParams(window.location.search)
          params.set('lat', latitude.toString())
          params.set('lng', longitude.toString())
          params.set('location', location.address)
          router.push(`/listings?${params.toString()}`)
          
          showToast('Location found! Searching nearby vehicles...', 'success')
        } finally {
          setIsLoading(false)
        }
      },
      (error) => {
        clearTimeout(timeoutId)
        setIsLoading(false)
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setHasPermission(false)
            showToast('Location permission denied. Please enable location access in your browser settings and try again.', 'error')
            break
          case error.POSITION_UNAVAILABLE:
            showToast('Location information is unavailable. Please check your device location settings.', 'error')
            break
          case error.TIMEOUT:
            setHasPermission(null) // Reset permission state
            showToast('Location request timed out. Please ensure location services are enabled and try again.', 'error')
            break
          default:
            showToast('An error occurred while retrieving your location. Please try again.', 'error')
            break
        }
      },
      {
        enableHighAccuracy: false, // Changed to false for faster response
        timeout: 12000, // Increased to 12 seconds
        maximumAge: 300000, // Accept cached location up to 5 minutes old
      }
    )
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (userLocation) {
      // Use existing location
      const params = new URLSearchParams(window.location.search)
      params.set('lat', userLocation.lat.toString())
      params.set('lng', userLocation.lng.toString())
      if (userLocation.address) {
        params.set('location', userLocation.address)
        if (inputId) {
          const input = document.getElementById(inputId) as HTMLInputElement
          if (input) {
            input.value = userLocation.address
          }
        }
      }
      router.push(`/listings?${params.toString()}`)
    } else {
      // Request new location
      getCurrentLocation()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="px-2.5 py-1.5 bg-brand-blue dark:bg-brand-blue-light text-white dark:text-white rounded-md hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-medium"
      title="Use my current location"
      aria-label="Use my current location"
      suppressHydrationWarning
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      )}
      <span className="hidden sm:inline text-xs">{isLoading ? 'Locating...' : 'Near Me'}</span>
    </button>
  )
}
