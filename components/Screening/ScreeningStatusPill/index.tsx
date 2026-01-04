/**
 * Screening Status Pill Component
 * Displays screening result as a badge/pill
 */

'use client'

interface ScreeningStatusPillProps {
  result?: 'pass' | 'conditional' | 'fail' | null
  status?: string
  screeningType?: 'mvr' | 'soft_credit'
  className?: string
}

export default function ScreeningStatusPill({
  result,
  status,
  screeningType,
  className = '',
}: ScreeningStatusPillProps) {
  // If no result yet, show status
  if (!result && status) {
    const statusColors = {
      requested: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      complete: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    }

    return (
      <span
        className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[status as keyof typeof statusColors] || statusColors.requested} ${className}`}
      >
        {status}
      </span>
    )
  }

  // Show result with appropriate colors
  const resultConfig = {
    pass: {
      label: 'PASS',
      className:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
    },
    conditional: {
      label: 'CONDITIONAL',
      className:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    },
    fail: {
      label: 'FAIL',
      className:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
    },
  }

  const config = resultConfig[result!]

  if (!config) {
    return null
  }

  const typeLabel = screeningType === 'mvr' ? 'MVR: ' : screeningType === 'soft_credit' ? 'Credit: ' : ''

  return (
    <span
      className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${config.className} ${className}`}
    >
      {typeLabel}
      {config.label}
    </span>
  )
}
