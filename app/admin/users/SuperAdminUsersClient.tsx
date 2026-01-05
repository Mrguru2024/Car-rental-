'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/Toast/ToastProvider'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface User {
  id: string
  user_id: string
  full_name: string | null
  email: string
  role: string
  verification_status: string
  created_at: string
  updated_at: string
}

interface UserDetails {
  profile: any
  auth: any
  bookings: any[]
  vehicles: any[]
  disputes: any[]
  complaints: any[]
  securityEvents: any[]
}

interface SuperAdminUsersClientProps {
  initialUsers: User[]
  totalUsers: number
}

export default function SuperAdminUsersClient({
  initialUsers,
  totalUsers,
}: SuperAdminUsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(totalUsers)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false)
  const { showToast } = useToast()

  const limit = 50

  const roles: { value: string; label: string }[] = [
    { value: 'all', label: 'All Roles' },
    { value: 'renter', label: 'Renter' },
    { value: 'dealer', label: 'Dealer' },
    { value: 'private_host', label: 'Private Host' },
    { value: 'admin', label: 'Admin' },
    { value: 'prime_admin', label: 'Prime Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ]

  const statuses: { value: string; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.append('search', search)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/admin/users/list?${params.toString()}`)
      const contentType = response.headers.get('content-type')
      if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch users')
        } else {
          throw new Error(`Failed to fetch users: ${response.statusText}`)
        }
      }

      const data = await response.json()
      setUsers(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, roleFilter, statusFilter])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchUsers()
      } else {
        setPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/details`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch user details')
      }

      const data = await response.json()
      setUserDetails(data.data)
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch user details', 'error')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user)
    setShowDetailsModal(true)
    await fetchUserDetails(user.id)
  }

  const handleSuspend = async (userId: string, reason?: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to suspend user')
      }

      showToast('User suspended successfully', 'success')
      fetchUsers()
      if (selectedUser?.id === userId) {
        await fetchUserDetails(userId)
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to suspend user', 'error')
    }
  }

  const handleUnsuspend = async (userId: string, reason?: string) => {
    if (!confirm('Are you sure you want to unsuspend this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unsuspend user')
      }

      showToast('User unsuspended successfully', 'success')
      fetchUsers()
      if (selectedUser?.id === userId) {
        await fetchUserDetails(userId)
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to unsuspend user', 'error')
    }
  }

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reset password')
      }

      const data = await response.json()
      showToast('Password reset link generated successfully', 'success')
      
      // Optionally copy reset link to clipboard
      if (data.data?.resetLink) {
        navigator.clipboard.writeText(data.data.resetLink)
        showToast('Reset link copied to clipboard', 'info')
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to reset password', 'error')
    }
  }

  const handleTroubleshoot = async (action: string) => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/troubleshoot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Troubleshooting action failed')
      }

      const data = await response.json()
      showToast(data.message || 'Action completed successfully', 'success')
      
      // Refresh user details
      await fetchUserDetails(selectedUser.id)
    } catch (error: any) {
      showToast(error.message || 'Action failed', 'error')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
      case 'prime_admin':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
      case 'admin':
        return 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light'
      case 'dealer':
      case 'private_host':
        return 'bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 xs:p-6 border border-brand-white dark:border-brand-navy/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email..."
              className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('')
                setRoleFilter('all')
                setStatusFilter('all')
                setPage(1)
              }}
              className="w-full px-4 py-2 bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70 transition-colors text-sm font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-gray/5 dark:bg-brand-navy/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-brand-gray dark:text-brand-white/70">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-brand-gray dark:text-brand-white/70">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30">
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-brand-navy dark:text-brand-white">
                          {user.full_name || 'N/A'}
                        </div>
                        <div className="text-xs text-brand-gray dark:text-brand-white/70">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                          user.verification_status
                        )}`}
                      >
                        {user.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-brand-gray dark:text-brand-white/70">
                      {formatDate(new Date(user.created_at))}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="px-3 py-1 text-xs bg-brand-blue text-white rounded hover:bg-brand-blue/90 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-4 border-t border-brand-gray/20 dark:border-brand-navy/50 flex items-center justify-between">
            <div className="text-sm text-brand-gray dark:text-brand-white/70">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 text-sm bg-white dark:bg-brand-navy border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded hover:bg-brand-gray/10 dark:hover:bg-brand-navy/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total || loading}
                className="px-3 py-1 text-sm bg-white dark:bg-brand-navy border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded hover:bg-brand-gray/10 dark:hover:bg-brand-navy/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          userDetails={userDetails}
          loading={loadingDetails}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedUser(null)
            setUserDetails(null)
          }}
          onSuspend={handleSuspend}
          onUnsuspend={handleUnsuspend}
          onResetPassword={handleResetPassword}
          onTroubleshoot={() => {
            setShowTroubleshootModal(true)
          }}
          showTroubleshootModal={showTroubleshootModal}
          onTroubleshootAction={handleTroubleshoot}
          onCloseTroubleshoot={() => setShowTroubleshootModal(false)}
        />
      )}
    </div>
  )
}

interface UserDetailsModalProps {
  user: User
  userDetails: UserDetails | null
  loading: boolean
  onClose: () => void
  onSuspend: (userId: string, reason?: string) => void
  onUnsuspend: (userId: string, reason?: string) => void
  onResetPassword: (userId: string) => void
  onTroubleshoot: () => void
  showTroubleshootModal: boolean
  onTroubleshootAction: (action: string) => void
  onCloseTroubleshoot: () => void
}

function UserDetailsModal({
  user,
  userDetails,
  loading,
  onClose,
  onSuspend,
  onUnsuspend,
  onResetPassword,
  onTroubleshoot,
  showTroubleshootModal,
  onTroubleshootAction,
  onCloseTroubleshoot,
}: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'vehicles' | 'disputes' | 'security'>('overview')
  const isBanned = userDetails?.auth?.user_metadata?.banned === true

  const troubleshootActions = [
    { id: 'fix_stuck_bookings', label: 'Fix Stuck Bookings', description: 'Auto-complete bookings past end date' },
    { id: 'sync_profile_verification', label: 'Sync Verification Status', description: 'Sync auth and profile verification' },
    { id: 'refresh_stripe_account', label: 'Refresh Stripe Account', description: 'Update Stripe Connect status' },
    { id: 'recalculate_ratings', label: 'Recalculate Ratings', description: 'Recalculate user ratings from reviews' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white dark:bg-brand-navy-light rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-brand-gray/20 dark:border-brand-navy/50 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                {user.full_name || user.email}
              </h2>
              <p className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">{user.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-brand-gray/20 dark:border-brand-navy/50 px-6">
            <div className="flex gap-4">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'bookings', label: 'Bookings' },
                { id: 'vehicles', label: 'Vehicles' },
                { id: 'disputes', label: 'Disputes' },
                { id: 'security', label: 'Security' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-brand-blue text-brand-blue dark:text-brand-blue-light'
                      : 'border-transparent text-brand-gray dark:text-brand-white/70 hover:text-brand-navy dark:hover:text-brand-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8 text-brand-gray dark:text-brand-white/70">Loading...</div>
            ) : userDetails ? (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab
                    user={user}
                    userDetails={userDetails}
                    isBanned={isBanned}
                    onSuspend={onSuspend}
                    onUnsuspend={onUnsuspend}
                    onResetPassword={onResetPassword}
                    onTroubleshoot={onTroubleshoot}
                  />
                )}
                {activeTab === 'bookings' && <BookingsTab bookings={userDetails.bookings} />}
                {activeTab === 'vehicles' && <VehiclesTab vehicles={userDetails.vehicles} />}
                {activeTab === 'disputes' && (
                  <DisputesTab disputes={userDetails.disputes} complaints={userDetails.complaints} />
                )}
                {activeTab === 'security' && <SecurityTab events={userDetails.securityEvents} />}
              </>
            ) : (
              <div className="text-center py-8 text-brand-gray dark:text-brand-white/70">
                Failed to load user details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Troubleshoot Modal */}
      {showTroubleshootModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCloseTroubleshoot}>
          <div
            className="bg-white dark:bg-brand-navy-light rounded-xl shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-brand-navy dark:text-brand-white mb-4">Troubleshooting Tools</h3>
            <div className="space-y-3">
              {troubleshootActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    onTroubleshootAction(action.id)
                    onCloseTroubleshoot()
                  }}
                  className="w-full text-left p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50 transition-colors"
                >
                  <div className="font-medium text-brand-navy dark:text-brand-white">{action.label}</div>
                  <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">{action.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={onCloseTroubleshoot}
              className="mt-6 w-full px-4 py-2 bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function OverviewTab({
  user,
  userDetails,
  isBanned,
  onSuspend,
  onUnsuspend,
  onResetPassword,
  onTroubleshoot,
}: any) {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onResetPassword(user.id)}
          className="p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50 transition-colors text-left"
        >
          <div className="font-medium text-brand-navy dark:text-brand-white">Reset Password</div>
          <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">Send reset email</div>
        </button>
        {isBanned ? (
          <button
            onClick={() => onUnsuspend(user.id)}
            className="p-4 border border-brand-green/20 dark:border-brand-green/50 rounded-lg hover:bg-brand-green/5 dark:hover:bg-brand-green/10 transition-colors text-left"
          >
            <div className="font-medium text-brand-navy dark:text-brand-white">Unsuspend User</div>
            <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">Restore access</div>
          </button>
        ) : (
          <button
            onClick={() => onSuspend(user.id)}
            className="p-4 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
          >
            <div className="font-medium text-brand-navy dark:text-brand-white">Suspend User</div>
            <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">Block access</div>
          </button>
        )}
        <button
          onClick={onTroubleshoot}
          className="p-4 border border-brand-blue/20 dark:border-brand-blue/50 rounded-lg hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10 transition-colors text-left"
        >
          <div className="font-medium text-brand-navy dark:text-brand-white">Troubleshoot</div>
          <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">Fix common issues</div>
        </button>
      </div>

      {/* User Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-brand-navy dark:text-brand-white mb-3">Profile Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Full Name:</span>
              <span className="text-brand-navy dark:text-brand-white">{userDetails.profile.full_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Email:</span>
              <span className="text-brand-navy dark:text-brand-white">{userDetails.auth?.email || user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Phone:</span>
              <span className="text-brand-navy dark:text-brand-white">{userDetails.profile.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Role:</span>
              <span className="text-brand-navy dark:text-brand-white">{userDetails.profile.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Verification:</span>
              <span className="text-brand-navy dark:text-brand-white">{userDetails.profile.verification_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Status:</span>
              <span className="text-brand-navy dark:text-brand-white">{isBanned ? 'Suspended' : 'Active'}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-brand-navy dark:text-brand-white mb-3">Account Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Total Bookings:</span>
              <span className="text-brand-navy dark:text-brand-white">{userDetails.bookings?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Total Vehicles:</span>
              <span className="text-brand-navy dark:text-brand-white">{userDetails.vehicles?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Active Disputes:</span>
              <span className="text-brand-navy dark:text-brand-white">
                {userDetails.disputes?.filter((d: any) => d.status !== 'resolved').length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Security Events:</span>
              <span className="text-brand-navy dark:text-brand-white">
                {userDetails.securityEvents?.filter((e: any) => !e.resolved).length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray dark:text-brand-white/70">Member Since:</span>
              <span className="text-brand-navy dark:text-brand-white">
                {formatDate(new Date(userDetails.profile.created_at))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingsTab({ bookings }: { bookings: any[] }) {
  return (
    <div className="space-y-4">
      {bookings.length === 0 ? (
        <div className="text-center py-8 text-brand-gray dark:text-brand-white/70">No bookings found</div>
      ) : (
        bookings.map((booking: any) => (
          <div
            key={booking.id}
            className="p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-brand-navy dark:text-brand-white">
                  {booking.vehicles?.make} {booking.vehicles?.model} {booking.vehicles?.year}
                </div>
                <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">
                  {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-brand-navy dark:text-brand-white">
                  {formatCurrency(booking.total_price / 100)}
                </div>
                <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">{booking.status}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function VehiclesTab({ vehicles }: { vehicles: any[] }) {
  return (
    <div className="space-y-4">
      {vehicles.length === 0 ? (
        <div className="text-center py-8 text-brand-gray dark:text-brand-white/70">No vehicles found</div>
      ) : (
        vehicles.map((vehicle: any) => (
          <div
            key={vehicle.id}
            className="p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-brand-navy dark:text-brand-white">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </div>
                <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">Status: {vehicle.status}</div>
              </div>
              <div className="text-sm text-brand-gray dark:text-brand-white/70">
                {formatDate(new Date(vehicle.created_at))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function DisputesTab({ disputes, complaints }: { disputes: any[]; complaints: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-brand-navy dark:text-brand-white mb-3">Disputes ({disputes.length})</h3>
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="text-center py-4 text-brand-gray dark:text-brand-white/70">No disputes found</div>
          ) : (
            disputes.map((dispute: any) => (
              <div
                key={dispute.id}
                className="p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-brand-navy dark:text-brand-white">{dispute.type}</div>
                    <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">{dispute.status}</div>
                  </div>
                  <div className="text-sm text-brand-gray dark:text-brand-white/70">
                    {formatDate(new Date(dispute.created_at))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-brand-navy dark:text-brand-white mb-3">Complaints ({complaints.length})</h3>
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <div className="text-center py-4 text-brand-gray dark:text-brand-white/70">No complaints found</div>
          ) : (
            complaints.map((complaint: any) => (
              <div
                key={complaint.id}
                className="p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-brand-navy dark:text-brand-white">{complaint.complaint_type}</div>
                    <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">{complaint.status}</div>
                  </div>
                  <div className="text-sm text-brand-gray dark:text-brand-white/70">
                    {formatDate(new Date(complaint.created_at))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SecurityTab({ events }: { events: any[] }) {
  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <div className="text-center py-8 text-brand-gray dark:text-brand-white/70">No security events found</div>
      ) : (
        events.map((event: any) => (
          <div
            key={event.id}
            className="p-4 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-brand-navy dark:text-brand-white">{event.event_type}</div>
                <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">{event.severity}</div>
                {event.description && (
                  <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">{event.description}</div>
                )}
              </div>
              <div className="text-right">
                <div
                  className={`text-sm ${event.resolved ? 'text-brand-green' : 'text-red-500'}`}
                >
                  {event.resolved ? 'Resolved' : 'Active'}
                </div>
                <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">
                  {formatDate(new Date(event.created_at))}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}