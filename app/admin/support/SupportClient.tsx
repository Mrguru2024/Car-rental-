'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'

interface Booking {
  id: string
  start_date: string
  end_date: string
  status: string
  total_price: number
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    email: string | null
  } | null
  vehicles: {
    id: string
    make: string
    model: string
    year: number
  } | null
}

interface Claim {
  id: string
  claim_type: string
  status: string
  description: string | null
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

interface SupportClientProps {
  recentBookings: Booking[]
  recentClaims: Claim[]
  pendingVerificationsCount: number
  pendingByoiCount: number
}

export default function SupportClient({
  recentBookings,
  recentClaims,
  pendingVerificationsCount,
  pendingByoiCount,
}: SupportClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showToast('Please enter a search query', 'error')
      return
    }

    setSearching(true)
    try {
      // Search users by name or email
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, verification_status, created_at')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10)

      if (error) throw error

      setSearchResults(profiles || [])
      if (!profiles || profiles.length === 0) {
        showToast('No users found', 'info')
      }
    } catch (error: any) {
      showToast(error.message || 'Search failed', 'error')
    } finally {
      setSearching(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
      case 'approved':
        return 'bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light'
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
      case 'canceled':
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/verifications"
          className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
              Pending Verifications
            </h3>
            {pendingVerificationsCount > 0 && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full">
                {pendingVerificationsCount}
              </span>
            )}
          </div>
          <p className="text-sm text-brand-gray dark:text-brand-white/70">
            Review account verifications
          </p>
        </Link>

        <Link
          href="/admin/byoi"
          className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white">
              Pending BYOI
            </h3>
            {pendingByoiCount > 0 && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-semibold rounded-full">
                {pendingByoiCount}
              </span>
            )}
          </div>
          <p className="text-sm text-brand-gray dark:text-brand-white/70">
            Review insurance documents
          </p>
        </Link>

        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
          <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
            Recent Bookings
          </h3>
          <p className="text-3xl font-bold text-brand-blue dark:text-brand-blue-light">
            {recentBookings.length}
          </p>
          <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">Last 20 bookings</p>
        </div>

        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
          <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-2">
            Recent Claims
          </h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {recentClaims.length}
          </p>
          <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">Last 10 claims</p>
        </div>
      </div>

      {/* User Search */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
        <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">
          User Search
        </h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or email..."
            className="flex-1 px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((user) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="block p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-brand-navy dark:text-brand-white">
                      {user.full_name || 'N/A'}
                    </h3>
                    <p className="text-sm text-brand-gray dark:text-brand-white/70">{user.email}</p>
                    <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
                      Role: {user.role} • Status: {user.verification_status}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                      user.verification_status
                    )}`}
                  >
                    {user.verification_status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
        <div className="p-6 border-b border-brand-gray/20 dark:border-brand-navy/50">
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white">Recent Bookings</h2>
        </div>
        <div className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/admin/bookings/${booking.id}`}
                className="block p-4 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                      {booking.vehicles
                        ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
                        : 'Unknown Vehicle'}
                    </h3>
                    <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-1">
                      {booking.profiles?.full_name || 'Unknown Renter'} • {booking.profiles?.email || 'N/A'}
                    </p>
                    <p className="text-xs text-brand-gray dark:text-brand-white/50">
                      {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-blue dark:text-brand-blue-light">
                      {formatCurrency(booking.total_price)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full capitalize mt-1 ${getStatusBadgeColor(
                        booking.status
                      )}`}
                    >
                      {booking.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">
              No recent bookings
            </div>
          )}
        </div>
      </div>

      {/* Recent Claims */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
        <div className="p-6 border-b border-brand-gray/20 dark:border-brand-navy/50">
          <h2 className="text-xl font-bold text-brand-navy dark:text-brand-white">Recent Claims</h2>
        </div>
        <div className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
          {recentClaims.length > 0 ? (
            recentClaims.map((claim) => (
              <div
                key={claim.id}
                className="p-4 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-1">
                      {claim.claim_type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    <p className="text-sm text-brand-gray dark:text-brand-white/70 mb-1">
                      {claim.profiles?.full_name || 'Unknown User'} • {claim.profiles?.email || 'N/A'}
                    </p>
                    {claim.description && (
                      <p className="text-sm text-brand-gray dark:text-brand-white/70 mt-2 line-clamp-2">
                        {claim.description}
                      </p>
                    )}
                    <p className="text-xs text-brand-gray dark:text-brand-white/50 mt-1">
                      {formatDate(new Date(claim.created_at))}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadgeColor(
                      claim.status
                    )}`}
                  >
                    {claim.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-brand-gray dark:text-brand-white/70">No recent claims</div>
          )}
        </div>
      </div>
    </div>
  )
}
