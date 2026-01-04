'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils/format'

interface CalendarClientProps {
  vehicles: any[]
  bookings: any[]
}

export default function CalendarClient({ vehicles, bookings }: CalendarClientProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | 'all'>('all')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const filteredBookings =
    selectedVehicle === 'all'
      ? bookings
      : bookings.filter((b) => b.vehicleId === selectedVehicle)

  // Get days in month
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const days = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i))
  }

  const getBookingsForDate = (date: Date) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return filteredBookings.filter((booking) => {
      const start = new Date(booking.startDate).toISOString().split('T')[0]
      const end = new Date(booking.endDate).toISOString().split('T')[0]
      return dateStr >= start && dateStr <= end
    })
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      {/* Vehicle Filter */}
      <div>
        <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
          Filter by Vehicle
        </label>
        <select
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 border border-brand-gray dark:border-brand-navy rounded-lg bg-white dark:bg-brand-navy-light text-brand-navy dark:text-brand-white text-sm sm:text-base touch-manipulation min-h-[44px]"
        >
          <option value="all">All Vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <button
            onClick={previousMonth}
            className="px-3 sm:px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors text-sm sm:text-base touch-manipulation min-h-[44px]"
          >
            ← Previous
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-brand-navy dark:text-brand-white text-center flex-1 min-w-[200px]">{monthName}</h2>
          <button
            onClick={nextMonth}
            className="px-3 sm:px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:bg-brand-blue-dark dark:hover:bg-brand-blue transition-colors text-sm sm:text-base touch-manipulation min-h-[44px]"
          >
            Next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 fold:gap-1.5 sm:gap-2 overflow-x-auto">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs fold:text-sm font-semibold text-brand-gray dark:text-brand-white/70 py-1.5 fold:py-2"
            >
              {day}
            </div>
          ))}

          {days.map((date, index) => {
            const dayBookings = date ? getBookingsForDate(date) : []
            const isToday =
              date &&
              date.toDateString() === new Date().toDateString()

            return (
              <div
                key={index}
                className={`min-h-16 fold:min-h-20 sm:min-h-24 p-1 fold:p-1.5 sm:p-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded ${
                  date ? 'bg-white dark:bg-brand-navy' : 'bg-gray-50 dark:bg-brand-navy-light'
                } ${isToday ? 'ring-2 ring-brand-blue dark:ring-brand-blue-light' : ''}`}
              >
                {date && (
                  <>
                    <div
                      className={`text-xs fold:text-sm font-medium mb-0.5 fold:mb-1 ${
                        isToday
                          ? 'text-brand-blue dark:text-brand-blue-light'
                          : 'text-brand-navy dark:text-brand-white'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5 fold:space-y-1">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-[10px] fold:text-xs p-0.5 fold:p-1 rounded truncate ${
                            booking.status === 'confirmed'
                              ? 'bg-brand-green/20 text-brand-green dark:bg-brand-green/30 dark:text-brand-green-light'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                          }`}
                          title={`${booking.vehicleName} - ${booking.renterName}`}
                        >
                          {booking.vehicleName}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] fold:text-xs text-brand-gray dark:text-brand-white/70">
                          +{dayBookings.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-brand-green/20 dark:bg-brand-green/30 rounded" />
          <span className="text-brand-gray dark:text-brand-white/70">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded" />
          <span className="text-brand-gray dark:text-brand-white/70">Pending Payment</span>
        </div>
      </div>
    </div>
  )
}
