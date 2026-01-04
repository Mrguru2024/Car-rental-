'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast/ToastProvider'
import { formatDate } from '@/lib/utils/format'
import { UserRole } from '@/lib/utils/roleHierarchy'

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

interface PermissionsClientProps {
  initialUsers: User[]
  totalUsers: number
  currentUserRole: string
}

export default function PermissionsClient({
  initialUsers,
  totalUsers,
  currentUserRole,
}: PermissionsClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(totalUsers)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ role?: string; verification_status?: string; notes?: string }>({})
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

  const handleUpdateUser = async (userId: string) => {
    if (!editForm.role && !editForm.verification_status) {
      showToast('Please select at least one field to update', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      const contentType = response.headers.get('content-type')
      if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update user')
        } else {
          throw new Error(`Failed to update user: ${response.statusText}`)
        }
      }

      showToast('User updated successfully', 'success')
      setEditingUser(null)
      setEditForm({})
      fetchUsers()
    } catch (error: any) {
      showToast(error.message || 'Failed to update user', 'error')
    } finally {
      setLoading(false)
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

  const canEditRole = (targetRole: string) => {
    // Only super_admin can assign prime_admin or super_admin
    if ((targetRole === 'prime_admin' || targetRole === 'super_admin') && currentUserRole !== 'super_admin') {
      return false
    }
    return true
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
                      {editingUser === user.id ? (
                        <select
                          value={editForm.role || user.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          disabled={!canEditRole(editForm.role || user.role)}
                          className="px-2 py-1 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light"
                        >
                          {roles
                            .filter((r) => r.value !== 'all')
                            .map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingUser === user.id ? (
                        <select
                          value={editForm.verification_status || user.verification_status}
                          onChange={(e) =>
                            setEditForm({ ...editForm, verification_status: e.target.value })
                          }
                          className="px-2 py-1 text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light"
                        >
                          {statuses
                            .filter((s) => s.value !== 'all')
                            .map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                            user.verification_status
                          )}`}
                        >
                          {user.verification_status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-brand-gray dark:text-brand-white/70">
                      {formatDate(new Date(user.created_at))}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {editingUser === user.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateUser(user.id)}
                            disabled={loading}
                            className="px-3 py-1 text-xs bg-brand-green text-white rounded hover:bg-brand-green/90 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null)
                              setEditForm({})
                            }}
                            disabled={loading}
                            className="px-3 py-1 text-xs bg-brand-gray/20 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white rounded hover:bg-brand-gray/30 dark:hover:bg-brand-navy/70 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUser(user.id)
                            setEditForm({ role: user.role, verification_status: user.verification_status })
                          }}
                          className="px-3 py-1 text-xs bg-brand-blue text-white rounded hover:bg-brand-blue/90 transition-colors"
                        >
                          Edit
                        </button>
                      )}
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
    </div>
  )
}
