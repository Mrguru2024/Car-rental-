'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast/ToastProvider'
import RichTextEditor from '@/components/Blog/RichTextEditor'
import BlogSuggestions from '@/components/Blog/BlogSuggestions'

interface Category {
  id: string
  name: string
  slug: string
}

interface Tag {
  id: string
  name: string
  slug: string
}

interface BlogPostData {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  featured_image_url?: string | null
  category_id?: string | null
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: string[] | null
  og_image_url?: string | null
  status?: 'draft' | 'published' | 'archived'
  published_at?: string | null
  tags?: Tag[]
}

interface BlogEditorClientProps {
  postId?: string
  initialData?: BlogPostData
  categories: Category[]
  tags: Tag[]
}

export default function BlogEditorClient({
  postId,
  initialData,
  categories: initialCategories,
  tags: initialTags,
}: BlogEditorClientProps) {
  const router = useRouter()
  const { showToast } = useToast()

  // Form state
  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialData?.featured_image_url || '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tags?.map(t => t.id) || []
  )
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || '')
  const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || '')
  const [metaKeywords, setMetaKeywords] = useState<string[]>(initialData?.meta_keywords || [])
  const [ogImageUrl, setOgImageUrl] = useState(initialData?.og_image_url || '')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    initialData?.status || 'draft'
  )

  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [tags, setTags] = useState(initialTags)
  const [newTagName, setNewTagName] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [categories, setCategories] = useState(initialCategories)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Suggestions state
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([])
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsQuery, setSuggestionsQuery] = useState('')

  // Auto-generate slug from title
  useEffect(() => {
    if (!postId && title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      setSlug(generatedSlug)
    }
  }, [title, slug, postId])

  // Auto-generate SEO fields
  useEffect(() => {
    if (title && !metaTitle) {
      setMetaTitle(title)
    }
    if (excerpt && !metaDescription) {
      setMetaDescription(excerpt.slice(0, 160))
    }
  }, [title, excerpt, metaTitle, metaDescription])

  // Fetch keyword suggestions
  const fetchKeywordSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setKeywordSuggestions([])
      return
    }

    try {
      const response = await fetch(`/api/blog/suggestions?type=keywords&query=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setKeywordSuggestions(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching keyword suggestions:', error)
    }
  }, [])

  // Fetch trending topics
  const fetchTrendingTopics = useCallback(async () => {
    try {
      const response = await fetch('/api/blog/suggestions?type=trending')
      if (response.ok) {
        const data = await response.json()
        // Handle both response formats: { suggestions: { trendingTopics: [...] } } or { suggestions: { trending: [...] } }
        const suggestions = data.suggestions || {}
        const trending = suggestions.trendingTopics || suggestions.trending || []
        setTrendingTopics(Array.isArray(trending) ? trending : [])
      }
    } catch (error) {
      console.error('Error fetching trending topics:', error)
    }
  }, [])

  useEffect(() => {
    fetchTrendingTopics()
  }, [fetchTrendingTopics])

  // Auto-save draft (debounced)
  useEffect(() => {
    if (!postId || loading) return

    const timer = setTimeout(async () => {
      if (title && slug && excerpt && content) {
        setSaving(true)
        try {
          const response = await fetch(`/api/admin/blog/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              slug,
              excerpt,
              content,
              featured_image_url: featuredImageUrl || null,
              category_id: categoryId || null,
              tag_ids: selectedTagIds,
              meta_title: metaTitle || null,
              meta_description: metaDescription || null,
              meta_keywords: metaKeywords,
              og_image_url: ogImageUrl || null,
              status: 'draft',
            }),
          })

          if (!response.ok) {
            throw new Error('Auto-save failed')
          }
        } catch (error) {
          console.error('Auto-save error:', error)
        } finally {
          setSaving(false)
        }
      }
    }, 3000) // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timer)
  }, [postId, title, slug, excerpt, content, featuredImageUrl, categoryId, selectedTagIds, metaTitle, metaDescription, metaKeywords, ogImageUrl, loading])

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setCreatingTag(true)
    try {
      const response = await fetch('/api/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tag')
      }

      const data = await response.json()
      setTags([...tags, data.data])
      setSelectedTagIds([...selectedTagIds, data.data.id])
      setNewTagName('')
      showToast('Tag created successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to create tag', 'error')
    } finally {
      setCreatingTag(false)
    }
  }

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setCreatingCategory(true)
    try {
      const response = await fetch('/api/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create category')
      }

      const data = await response.json()
      setCategories([...categories, data.data])
      setCategoryId(data.data.id)
      setNewCategoryName('')
      setNewCategoryDescription('')
      showToast('Category created successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to create category', 'error')
    } finally {
      setCreatingCategory(false)
    }
  }

  // Upload image to Supabase storage
  const handleImageUpload = async (file: File, type: 'featured' | 'og') => {
    setUploadingImage(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/blog/${timestamp}.${fileExt}`
      const filePath = `blog-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('blog-images').getPublicUrl(filePath)

      if (type === 'featured') {
        setFeaturedImageUrl(publicUrl)
      } else {
        setOgImageUrl(publicUrl)
      }

      showToast('Image uploaded successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to upload image', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle save/publish
  const handleSave = async (publish: boolean = false) => {
    if (!title || !slug || !excerpt || !content) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title,
        slug,
        excerpt,
        content,
        featured_image_url: featuredImageUrl || null,
        category_id: categoryId || null,
        tag_ids: selectedTagIds,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        meta_keywords: metaKeywords,
        og_image_url: ogImageUrl || null,
        status: publish ? 'published' : 'draft',
        published_at: publish ? new Date().toISOString() : null,
      }

      const url = postId ? `/api/admin/blog/posts/${postId}` : '/api/blog/posts'
      const method = postId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save post')
      }

      const data = await response.json()
      showToast(
        publish ? 'Blog post published successfully!' : 'Blog post saved as draft',
        'success'
      )

      if (!postId) {
        router.push(`/admin/blog/${data.data.id}/edit`)
      } else {
        router.refresh()
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to save post', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (type: string, value: any) => {
    switch (type) {
      case 'title':
        setTitle(value)
        break
      case 'keyword':
        if (!metaKeywords.includes(value)) {
          setMetaKeywords([...metaKeywords, value])
        }
        break
      case 'trending':
        if (value.title) {
          setTitle(value.title)
        }
        if (value.keywords && Array.isArray(value.keywords)) {
          const newKeywords = value.keywords.filter((k: string) => !metaKeywords.includes(k))
          setMetaKeywords([...metaKeywords, ...newKeywords])
        }
        break
      case 'metaDescription':
        setMetaDescription(value)
        break
    }
  }

  // Add keyword to meta keywords
  const handleAddKeyword = (keyword: string) => {
    if (!metaKeywords.includes(keyword)) {
      setMetaKeywords([...metaKeywords, keyword])
    }
    setSuggestionsQuery('')
    setKeywordSuggestions([])
  }

  // Remove keyword
  const handleRemoveKeyword = (keyword: string) => {
    setMetaKeywords(metaKeywords.filter(k => k !== keyword))
  }

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-navy dark:text-brand-white mb-2">
            {postId ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-brand-gray dark:text-brand-white/70">
            Create high-quality, SEO-optimized blog posts to drive traffic
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
          {saving && (
            <span className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70 text-center sm:text-left whitespace-nowrap">
              Auto-saving...
            </span>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              href="/admin/blog"
              className="flex-1 sm:flex-none px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors text-center text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center justify-center font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation min-h-[44px] font-medium"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium text-sm sm:text-base lg:text-lg touch-manipulation min-h-[44px]"
            >
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-full grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Main Editor */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Title */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter blog post title..."
              className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-sm sm:text-base lg:text-lg border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="blog-post-url-slug"
              className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-sm sm:text-base lg:text-lg border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation font-mono"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2">
              Excerpt <span className="text-red-500">*</span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Write a brief excerpt (used in listings and SEO)"
              rows={3}
              className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-sm sm:text-base lg:text-lg border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light resize-none touch-manipulation"
            />
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white">
                Content <span className="text-red-500">*</span>
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 transition-colors touch-manipulation min-h-[36px] sm:min-h-[40px]"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {showPreview ? (
              <div className="min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] p-4 sm:p-6 lg:p-8 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl">{title || 'Untitled'}</h1>
                {featuredImageUrl && (
                  <img src={featuredImageUrl} alt={title} className="w-full rounded-lg mt-4 sm:mt-6" />
                )}
                <div className="mt-4 sm:mt-6" dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            ) : (
              <RichTextEditor value={content} onChange={setContent} />
            )}
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2 sm:mb-3">
              Featured Image
            </label>
            <div className="space-y-3 sm:space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleImageUpload(file, 'featured')
                  }
                }}
                disabled={uploadingImage}
                className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light disabled:opacity-50 touch-manipulation"
              />
              <div className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70 text-center">OR</div>
              <input
                type="url"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-sm sm:text-base lg:text-lg border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
              />
            </div>
            {featuredImageUrl && (
              <div className="mt-3 sm:mt-4">
                <img
                  src={featuredImageUrl}
                  alt="Featured"
                  className="w-full max-w-full sm:max-w-md lg:max-w-lg rounded-lg border border-brand-gray/20 dark:border-brand-navy/50"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* AI Suggestions */}
          <BlogSuggestions
            category={categories.find(c => c.id === categoryId)?.name}
            onSuggestionSelect={handleSuggestionSelect}
            currentTitle={title}
            currentKeywords={metaKeywords}
          />

          {/* Publish Status */}
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-5 lg:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 sm:mb-4">
              Publish Status
            </h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
              className="w-full px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Category */}
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-5 lg:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 sm:mb-4">
              Category
            </h3>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light mb-3 sm:mb-4 touch-manipulation"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-brand-gray/20 dark:border-brand-navy/50">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateCategory()
                  }
                }}
                placeholder="Create new category"
                className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light text-sm sm:text-base touch-manipulation"
              />
              <textarea
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light text-sm sm:text-base resize-none touch-manipulation"
              />
              <button
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
                className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light rounded-lg hover:bg-brand-green/20 dark:hover:bg-brand-green/30 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation min-h-[44px] font-medium"
              >
                {creatingCategory ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-5 lg:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 sm:mb-4">
              Tags
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {tags
                  .filter((tag) => selectedTagIds.includes(tag.id))
                  .map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 sm:px-4 py-1 sm:py-1.5 bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light rounded-full text-xs sm:text-sm lg:text-base flex items-center gap-1.5 sm:gap-2 font-medium"
                    >
                      {tag.name}
                      <button
                        onClick={() => setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id))}
                        className="hover:text-brand-blue-dark dark:hover:text-brand-blue text-base sm:text-lg lg:text-xl leading-none touch-manipulation min-w-[20px] min-h-[20px] flex items-center justify-center"
                        aria-label={`Remove ${tag.name} tag`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedTagIds([...selectedTagIds, e.target.value])
                    e.target.value = ''
                  }
                }}
                className="w-full px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
              >
                <option value="">Add a tag</option>
                {tags
                  .filter((tag) => !selectedTagIds.includes(tag.id))
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </select>
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateTag()
                    }
                  }}
                  placeholder="Create new tag"
                  className="flex-1 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light text-sm sm:text-base touch-manipulation"
                />
                <button
                  onClick={handleCreateTag}
                  disabled={creatingTag || !newTagName.trim()}
                  className="px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green-light rounded-lg hover:bg-brand-green/20 dark:hover:bg-brand-green/30 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation min-h-[44px] font-medium whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-5 lg:p-6 border border-brand-white dark:border-brand-navy/50">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 sm:mb-4 lg:mb-5">
              SEO Settings
            </h3>
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO title (recommended: 50-60 characters)"
                  maxLength={60}
                  className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70 mt-1.5 sm:mt-2">
                  {metaTitle.length}/60 characters
                </p>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2">
                  Meta Description
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="SEO description (recommended: 150-160 characters)"
                  rows={3}
                  maxLength={160}
                  className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light resize-none touch-manipulation"
                />
                <p className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70 mt-1.5 sm:mt-2">
                  {metaDescription.length}/160 characters
                </p>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2">
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-2 sm:mb-3">
                  {metaKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white rounded text-xs sm:text-sm lg:text-base flex items-center gap-1.5 sm:gap-2 font-medium"
                    >
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="hover:text-red-500 text-base sm:text-lg lg:text-xl leading-none touch-manipulation min-w-[20px] min-h-[20px] flex items-center justify-center"
                        aria-label={`Remove ${keyword} keyword`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={suggestionsQuery}
                    onChange={(e) => {
                      setSuggestionsQuery(e.target.value)
                      fetchKeywordSuggestions(e.target.value)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Add keyword..."
                    className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
                  />
                  {showSuggestions && keywordSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-brand-navy border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {keywordSuggestions.slice(0, 10).map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleAddKeyword(keyword)}
                          className="w-full text-left px-4 py-2 sm:py-2.5 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/30 text-brand-navy dark:text-brand-white text-sm sm:text-base touch-manipulation"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-brand-navy dark:text-brand-white mb-2">
                  OG Image (Social Sharing)
                </label>
                <div className="space-y-2 sm:space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleImageUpload(file, 'og')
                      }
                    }}
                    disabled={uploadingImage}
                    className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light disabled:opacity-50 touch-manipulation"
                  />
                  <div className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70 text-center">OR</div>
                  <input
                    type="url"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder="Social sharing image URL"
                    className="w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light touch-manipulation"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trending Topics */}
          {trendingTopics.length > 0 && (
            <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-4 sm:p-5 lg:p-6 border border-brand-white dark:border-brand-navy/50">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-brand-navy dark:text-brand-white mb-3 sm:mb-4 lg:mb-5">
                Trending Topics
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {trendingTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setTitle(topic.topic)
                      handleAddKeyword(topic.topic.toLowerCase())
                    }}
                    className="w-full text-left px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 bg-brand-gray/5 dark:bg-brand-navy/30 hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 rounded-lg text-sm sm:text-base text-brand-navy dark:text-brand-white transition-colors touch-manipulation"
                  >
                    <div className="font-medium mb-1">{topic.topic}</div>
                    <div className="text-xs sm:text-sm text-brand-gray dark:text-brand-white/70">
                      {topic.category}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
