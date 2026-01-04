'use client'

interface AnalyticsClientProps {
  monthlyRevenue: Record<string, number>
}

export default function AnalyticsClient({ monthlyRevenue }: AnalyticsClientProps) {
  const maxRevenue = Math.max(...Object.values(monthlyRevenue), 1)
  const months = Object.keys(monthlyRevenue)
  const values = Object.values(monthlyRevenue)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 sm:h-64 overflow-x-auto pb-2">
        {values.map((value, index) => {
          const height = (value / maxRevenue) * 100
          return (
            <div key={months[index]} className="flex-1 min-w-[40px] sm:min-w-0 flex flex-col items-center gap-1 sm:gap-2">
              <div className="relative w-full h-full flex items-end">
                <div
                  className="w-full bg-brand-blue dark:bg-brand-blue-light rounded-t transition-all hover:opacity-80 cursor-pointer"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${months[index]}: $${value.toFixed(2)}`}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-brand-gray dark:text-brand-white/70 text-center truncate w-full">
                {months[index]}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] sm:text-xs text-brand-gray dark:text-brand-white/70">
        <span>${Math.min(...values).toFixed(0)}</span>
        <span>${maxRevenue.toFixed(0)}</span>
      </div>
    </div>
  )
}
