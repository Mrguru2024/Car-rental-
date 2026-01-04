'use client'

import { useState, useEffect, useRef } from 'react'

interface MakeAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
  name?: string
}

export default function MakeAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = 'e.g., Toyota',
  required = false,
  className = '',
  id,
  name = 'make',
}: MakeAutocompleteProps) {
  const [allMakes, setAllMakes] = useState<string[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch all makes on mount
    const fetchMakes = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/vehicles/makes')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const makeNames = data.data.map((make: any) => make.Make_Name).sort()
            setAllMakes(makeNames)
          }
        }
      } catch (error) {
        console.error('Error fetching makes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMakes()
  }, [])

  const filterMakes = (inputValue: string) => {
    if (inputValue.length > 0) {
      const filtered = allMakes.filter((make) =>
        make.toLowerCase().includes(inputValue.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    onChange(inputValue)
    filterMakes(inputValue)
  }

  const handleSelect = (make: string) => {
    onChange(make)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleFocus = () => {
    filterMakes(value)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={() => {
          // Delay to allow suggestion click to register
          setTimeout(() => {
            setShowSuggestions(false)
            onBlur?.()
          }, 200)
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={className}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-brand-navy-light border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.slice(0, 10).map((make, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(make)}
              className="w-full text-left px-4 py-2 hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 text-brand-navy dark:text-brand-white transition-colors"
            >
              {make}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
