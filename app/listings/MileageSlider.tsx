'use client'

import { useEffect, useRef, useState } from 'react'

interface MileageSliderProps {
  minMileage?: string
  maxMileage?: string
}

const MAX_MILES = 1000
const UNLIMITED_VALUE = 'unlimited'

export default function MileageSlider({ minMileage, maxMileage }: MileageSliderProps) {
  const minSliderRef = useRef<HTMLInputElement>(null)
  const maxSliderRef = useRef<HTMLInputElement>(null)
  const minValueRef = useRef<HTMLSpanElement>(null)
  const maxValueRef = useRef<HTMLSpanElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const [maxIsUnlimited, setMaxIsUnlimited] = useState(
    maxMileage === UNLIMITED_VALUE || !maxMileage || parseInt(maxMileage || '0') >= MAX_MILES
  )

  useEffect(() => {
    const minSlider = minSliderRef.current
    const maxSlider = maxSliderRef.current
    const minValue = minValueRef.current
    const maxValue = maxValueRef.current

    if (!minSlider || !maxSlider || !minValue || !maxValue) return

    const formatValue = (value: string, isMax: boolean) => {
      if (isMax && (value === String(MAX_MILES) || parseInt(value) >= MAX_MILES)) {
        return 'Unlimited'
      }
      return `${value} mi`
    }

    const updateMinValue = () => {
      if (minValue) {
        minValue.textContent = formatValue(minSlider.value, false)
      }
      // Ensure min doesn't exceed max (unless max is unlimited)
      const maxVal = maxIsUnlimited ? MAX_MILES : parseInt(maxSlider.value)
      if (parseInt(minSlider.value) > maxVal) {
        minSlider.value = String(maxVal)
        if (minValue) {
          minValue.textContent = formatValue(minSlider.value, false)
        }
      }
    }

    const updateMaxValue = () => {
      const maxVal = parseInt(maxSlider.value)
      const isUnlimited = maxVal >= MAX_MILES
      setMaxIsUnlimited(isUnlimited)

      if (maxValue) {
        maxValue.textContent = formatValue(maxSlider.value, true)
      }

      // Update hidden input for form submission
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = isUnlimited ? UNLIMITED_VALUE : maxSlider.value
      }

      // Ensure max doesn't go below min (unless max is at unlimited)
      if (!isUnlimited && maxVal < parseInt(minSlider.value)) {
        maxSlider.value = minSlider.value
        const newMaxVal = parseInt(maxSlider.value)
        const newIsUnlimited = newMaxVal >= MAX_MILES
        if (maxValue) {
          maxValue.textContent = formatValue(maxSlider.value, true)
        }
        if (hiddenInputRef.current) {
          hiddenInputRef.current.value = newIsUnlimited ? UNLIMITED_VALUE : maxSlider.value
        }
        setMaxIsUnlimited(newIsUnlimited)
      }
    }

    minSlider.addEventListener('input', updateMinValue)
    maxSlider.addEventListener('input', updateMaxValue)

    // Initialize values
    updateMinValue()
    updateMaxValue()

    return () => {
      minSlider.removeEventListener('input', updateMinValue)
      maxSlider.removeEventListener('input', updateMaxValue)
    }
  }, [maxIsUnlimited])

  // Initialize max slider value
  const initialMaxValue = maxMileage === UNLIMITED_VALUE || !maxMileage || parseInt(maxMileage || '0') >= MAX_MILES
    ? MAX_MILES
    : parseInt(maxMileage || String(MAX_MILES))

  return (
    <div className="sm:col-span-2 md:col-span-2 lg:col-span-2 xl:col-span-2 w-full min-w-0">
      <label htmlFor="mileage-range" className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
        Mileage Limit Range
      </label>
      <div className="space-y-2 w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
          <div className="flex-1 min-w-0 w-full">
            <label htmlFor="min-mileage-slider" className="sr-only">Minimum mileage</label>
            <input
              ref={minSliderRef}
              type="range"
              id="min-mileage-slider"
              name="min_mileage_limit"
              min="0"
              max={MAX_MILES}
              step="50"
              defaultValue={minMileage || '0'}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-0 w-full">
            <label htmlFor="max-mileage-slider" className="sr-only">Maximum mileage</label>
            <input
              ref={maxSliderRef}
              type="range"
              id="max-mileage-slider"
              min="0"
              max={MAX_MILES}
              step="50"
              defaultValue={String(initialMaxValue)}
              className="w-full"
            />
            {/* Hidden input for form submission with "unlimited" value when at max */}
            <input
              ref={hiddenInputRef}
              type="hidden"
              id="max_mileage_limit_hidden"
              name="max_mileage_limit"
              defaultValue={maxMileage === UNLIMITED_VALUE || initialMaxValue >= MAX_MILES ? UNLIMITED_VALUE : String(initialMaxValue)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm text-brand-gray dark:text-brand-white/70 px-1 w-full">
          <span ref={minValueRef} className="truncate min-w-0">{minMileage || '0'} mi</span>
          <span className="mx-2 flex-shrink-0">to</span>
          <span ref={maxValueRef} className="truncate text-right min-w-0">
            {maxMileage === UNLIMITED_VALUE || initialMaxValue >= MAX_MILES ? 'Unlimited' : `${initialMaxValue} mi`}
          </span>
        </div>
      </div>
    </div>
  )
}