'use client'

import { useRouter } from 'next/navigation'

interface ResetFiltersButtonProps {
  formId?: string // Optional form ID to reset form fields
}

export default function ResetFiltersButton({ formId }: ResetFiltersButtonProps) {
  const router = useRouter()

  const handleReset = () => {
    // Reset form fields if form ID provided
    if (formId) {
      const form = document.getElementById(formId) as HTMLFormElement
      if (form) {
        form.reset()
      }
    }

    // Navigate to listings page without any query parameters
    router.push('/listings')
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      className="w-full xl:w-auto flex-shrink-0 px-3 py-2.5 border border-brand-gray dark:border-brand-navy rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium text-brand-navy dark:text-white flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap text-sm sm:text-base min-h-[42px]"
      suppressHydrationWarning
      title="Reset all filters"
      aria-label="Reset all filters"
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
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
      <span className="hidden sm:inline">Reset</span>
    </button>
  )
}
