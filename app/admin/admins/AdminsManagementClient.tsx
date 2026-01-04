'use client'

import { useState } from 'react'
import { useToast } from '@/components/Toast/ToastProvider'
import { formatDate } from '@/lib/utils/format'

interface AdminUser {
  user_id: string
  email: string | null
  phone: string | null
  role: string
  full_name: string | null
  created_at: string
}

interface AdminsManagementClientProps {
  initialAdmins: AdminUser[]
}

export default function AdminsManagementClient({ initialAdmins }: AdminsManagementClientProps) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    phone: '',
    password: '',
    role: 'admin',
    full_name: '',
  })
  const { showToast } = useToast()

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!createForm.email && !createForm.phone) {
        showToast('Email or phone number is required', 'error')
        return
      }

      if (!createForm.password || createForm.password.length < 6) {
        showToast('Password must be at least 6 characters', 'error')
        return
      }

      const response = await fetch('/api/admin/users/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: createForm.email || undefined,
          phone: createForm.phone || undefined,
          password: createForm.password,
          role: createForm.role,
          full_name: createForm.full_name || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin user')
      }

      showToast(data.message || 'Admin user created successfully', 'success')
      setShowCreateForm(false)
      setCreateForm({
        email: '',
        phone: '',
        password: '',
        role: 'admin',
        full_name: '',
      })

      // Refresh admin list by reloading page
      window.location.reload()
    } catch (error: any) {
      showToast(error.message || 'Failed to create admin user', 'error')
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
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div>
      {/* Create Admin Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:bg-brand-blue/90 dark:hover:bg-brand-blue-light/90 transition-colors font-medium"
        >
          {showCreateForm ? 'Cancel' : '+ Create New Admin'}
        </button>
      </div>

      {/* Create Admin Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50 mb-6">
          <h2 className="text-xl font-semibold text-brand-navy dark:text-brand-white mb-4">
            Create New Admin User
          </h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Email (optional if phone provided)
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Phone Number (optional if email provided)
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Full Name (optional)
                </label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-navy dark:text-brand-white mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-gray dark:border-brand-navy rounded-lg focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light focus:border-transparent bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="prime_admin">Prime Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:bg-brand-blue/90 dark:hover:bg-brand-blue-light/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-brand-gray dark:border-brand-navy rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Users List */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
        <div className="p-6 border-b border-brand-gray/20 dark:border-brand-navy/50">
          <h2 className="text-xl font-semibold text-brand-navy dark:text-brand-white">
            Admin Users ({admins.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-gray/10 dark:bg-brand-navy/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Email / Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray dark:text-brand-white/70 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/20 dark:divide-brand-navy/50">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-brand-gray dark:text-brand-white/70">
                    No admin users found
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.user_id} className="hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-brand-navy dark:text-brand-white">
                        {admin.full_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-brand-gray dark:text-brand-white/70">
                        {admin.email || admin.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                          admin.role
                        )}`}
                      >
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray dark:text-brand-white/70">
                      {formatDate(admin.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
