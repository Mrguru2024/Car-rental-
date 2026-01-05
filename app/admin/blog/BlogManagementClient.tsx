'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { useToast } from '@/components/Toast/ToastProvider'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  created_at: string
  updated_at: string
  view_count: number
  reading_time_minutes: number | null
  blog_categories: { id: string; name: string; slug: string } | null
  profiles: { id: string; full_name: string | null } | null
  tags?: Array<{ id: string; name: string; slug: string }>
}

interface BlogManagementClientProps {
  initialPosts: BlogPost[]
}

export default function BlogManagementClient({ initialPosts }: BlogManagementClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [loading, setLoading] = useState(false)

  const filteredPosts = posts.filter(post => {
    if (filterStatus === 'all') return true
    return post.status === filterStatus
  })

  const handleDelete = async (postId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/blog/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete post')
      }

      setPosts(posts.filter(p => p.id !== postId))
      showToast('Blog post deleted successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to delete post', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy dark:text-brand-white mb-2">
            Blog Management
          </h1>
          <p className="text-brand-gray dark:text-brand-white/70">
            Create and manage blog posts for SEO and content marketing
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Create New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === status
                ? 'bg-brand-blue dark:bg-brand-blue-light text-white'
                : 'bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts Table */}
      <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 border border-brand-white dark:border-brand-navy/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-gray/5 dark:bg-brand-navy/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-navy dark:text-brand-white">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-navy dark:text-brand-white">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-navy dark:text-brand-white">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-navy dark:text-brand-white">
                  Views
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-navy dark:text-brand-white">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-navy dark:text-brand-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10 dark:divide-brand-navy/50">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-gray dark:text-brand-white/70">
                    No blog posts found
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-brand-navy dark:text-brand-white">
                          {post.title}
                        </div>
                        <div className="text-sm text-brand-gray dark:text-brand-white/70 mt-1">
                          {post.excerpt.slice(0, 100)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-gray dark:text-brand-white/70">
                      {post.blog_categories?.name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                          post.status
                        )}`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-gray dark:text-brand-white/70">
                      {post.view_count || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-gray dark:text-brand-white/70">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="px-3 py-1 text-sm bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light rounded hover:bg-brand-blue/20 dark:hover:bg-brand-blue/30 transition-colors"
                        >
                          Edit
                        </Link>
                        {post.status === 'published' && (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="px-3 py-1 text-sm bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light rounded hover:bg-brand-green/20 dark:hover:bg-brand-green/30 transition-colors"
                          >
                            View
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
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
