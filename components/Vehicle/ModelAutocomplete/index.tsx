'use client'

import { useState, useEffect, useRef } from 'react'

interface ModelAutocompleteProps {
  value: string
  onChange: (value: string) => void
  make: string
  year?: number
  onBlur?: () => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
  name?: string
}

export default function ModelAutocomplete({
  value,
  onChange,
  make,
  year,
  onBlur,
  placeholder = 'e.g., Camry',
  required = false,
  className = '',
  id,
  name = 'model',
}: ModelAutocompleteProps) {
  const [allModels, setAllModels] = useState<string[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch models when make changes
    const fetchModels = async () => {
      if (!make || make.length < 2) {
        setAllModels([])
        setFilteredSuggestions([])
        return
      }

      try {
        setLoading(true)
        let url = `/api/vehicles/models?make=${encodeURIComponent(make)}`
        if (year) {
          url += `&year=${year}`
        }

        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const modelNames = data.data
              .map((model: any) => model.Model_Name)
              .filter((name: string, index: number, self: string[]) => self.indexOf(name) === index) // Remove duplicates
              .sort()
            setAllModels(modelNames)
          }
        }
      } catch (error) {
        console.error('Error fetching models:', error)
      } finally {
        setLoading(false)
      }
    }

    // Debounce the fetch
    const timer = setTimeout(fetchModels, 300)
    return () => clearTimeout(timer)
  }, [make, year])

  const filterModels = (inputValue: string) => {
    if (allModels.length === 0) {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (inputValue.length > 0) {
      const filtered = allModels.filter((model) =>
        model.toLowerCase().includes(inputValue.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      // Show all models when input is empty and focused
      setFilteredSuggestions(allModels)
      setShowSuggestions(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    onChange(inputValue)
    filterModels(inputValue)
  }

  const handleSelect = (model: string) => {
    onChange(model)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleFocus = () => {
    filterModels(value)
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
        disabled={!make || make.length < 2}
        autoComplete="off"
        className={className}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-brand-navy-light border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.slice(0, 10).map((model, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(model)}
              className="w-full text-left px-4 py-2 hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 text-brand-navy dark:text-brand-white transition-colors"
            >
              {model}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!make || make.length < 2 ? (
        <p className="text-xs text-brand-gray dark:text-brand-white/70 mt-1">
          Enter a make first
        </p>
      ) : null}
    </div>
  )
}
