import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import BlogCard from '@/components/Blog/BlogCard'
import BlogSearchBar from '@/components/Blog/SearchBar'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Expert car rental tips, travel guides, vehicle maintenance advice, and industry news from Carsera. Learn everything you need to know about renting cars and managing your rental business.',
  keywords: ['car rental blog', 'car rental tips', 'travel guides', 'vehicle maintenance', 'car rental advice'],
  openGraph: {
    title: 'Blog | Carsera',
    description: 'Expert car rental tips, travel guides, vehicle maintenance advice, and industry news from Carsera.',
    type: 'website',
    siteName: 'Carsera',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Carsera',
    description: 'Expert car rental tips, travel guides, vehicle maintenance advice, and industry news from Carsera.',
  },
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; search?: string; page?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const { category, tag, search, page = '1' } = params

  const limit = 12
  const offset = (parseInt(page) - 1) * limit

  // Fetch blog posts directly from database
  let postsQuery = supabase
    .from('blog_posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      featured_image_url,
      published_at,
      view_count,
      reading_time_minutes,
      created_at,
      blog_categories(id, name, slug),
      profiles!blog_posts_author_id_fkey(id, full_name)
    `, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) {
    postsQuery = postsQuery.eq('blog_categories.slug', category)
  }

  if (search) {
    postsQuery = postsQuery.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const { data: posts, count } = await postsQuery

  // Get tags for posts
  const postIds = posts?.map(p => p.id) || []
  let postsWithTags = posts || []

  if (postIds.length > 0) {
    const { data: postTags } = await supabase
      .from('blog_post_tags')
      .select(`
        post_id,
        blog_tags(id, name, slug)
      `)
      .in('post_id', postIds)

    const tagsByPostId = new Map<string, any[]>()
    postTags?.forEach((pt: any) => {
      if (!tagsByPostId.has(pt.post_id)) {
        tagsByPostId.set(pt.post_id, [])
      }
      tagsByPostId.get(pt.post_id)?.push(pt.blog_tags)
    })

    postsWithTags = posts?.map(post => ({
      ...post,
      tags: tagsByPostId.get(post.id) || [],
    })) || []

    // Filter by tag if specified
    if (tag) {
      const { data: tagData } = await supabase
        .from('blog_tags')
        .select('id')
        .eq('slug', tag)
        .single()

      if (tagData) {
        postsWithTags = postsWithTags.filter((post: any) => {
          const postTagIds = (post.tags || []).map((t: any) => t.id)
          return postTagIds.includes(tagData.id)
        })
      }
    }
  }

  const pagination = {
    page: parseInt(page),
    totalPages: Math.ceil((count || 0) / limit),
    total: count || 0,
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from('blog_categories')
    .select('*')
    .order('name', { ascending: true })

  // Get post counts for categories
  const { data: postCounts } = await supabase
    .from('blog_posts')
    .select('category_id')
    .eq('status', 'published')

  const countsByCategory = new Map<string, number>()
  postCounts?.forEach((p) => {
    if (p.category_id) {
      countsByCategory.set(p.category_id, (countsByCategory.get(p.category_id) || 0) + 1)
    }
  })

  const categoriesWithCounts = categories?.map((cat) => ({
    ...cat,
    post_count: countsByCategory.get(cat.id) || 0,
  })) || []

  // Fetch tags
  const { data: tags } = await supabase
    .from('blog_tags')
    .select('*')
    .order('name', { ascending: true })

  // Get post counts for tags
  const { data: postTags } = await supabase
    .from('blog_post_tags')
    .select('tag_id')

  const countsByTag = new Map<string, number>()
  postTags?.forEach((pt) => {
    countsByTag.set(pt.tag_id, (countsByTag.get(pt.tag_id) || 0) + 1)
  })

  const tagsWithCounts = tags?.map((tagItem) => ({
    ...tagItem,
    post_count: countsByTag.get(tagItem.id) || 0,
  })) || []

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-brand-blue/10 via-brand-green/10 to-brand-blue/10 dark:from-brand-blue/20 dark:via-brand-green/20 dark:to-brand-blue/20 py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-white dark:from-brand-navy via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light text-sm font-semibold rounded-full">
                Latest Articles
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-navy dark:text-brand-white mb-6 bg-gradient-to-r from-brand-navy to-brand-blue dark:from-brand-white dark:to-brand-blue-light bg-clip-text text-transparent">
              Carsera Blog
            </h1>
            <p className="text-xl md:text-2xl text-brand-gray dark:text-brand-white/70 max-w-3xl mx-auto mb-8">
              Expert tips, travel guides, and insights to help you get the most out of car rentals
            </p>
            <div className="max-w-2xl mx-auto">
              <BlogSearchBar />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Categories */}
              <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-4">
                  Categories
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/blog"
                      className={`block px-3 py-2 rounded-lg transition-colors ${
                        !category
                          ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light font-medium'
                          : 'text-brand-gray dark:text-brand-white/70 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50'
                      }`}
                    >
                      All ({pagination.total})
                    </Link>
                  </li>
                  {categoriesWithCounts.map((cat: any) => (
                    <li key={cat.id}>
                      <Link
                        href={`/blog?category=${cat.slug}`}
                        className={`block px-3 py-2 rounded-lg transition-colors ${
                          category === cat.slug
                            ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light font-medium'
                            : 'text-brand-gray dark:text-brand-white/70 hover:bg-brand-gray/5 dark:hover:bg-brand-navy/50'
                        }`}
                      >
                        {cat.name} ({cat.post_count || 0})
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Popular Tags */}
              {tagsWithCounts.filter((t: any) => t.post_count > 0).length > 0 && (
                <div className="bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 p-6 border border-brand-white dark:border-brand-navy/50">
                  <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-4">
                    Popular Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tagsWithCounts
                      .filter((t: any) => t.post_count > 0)
                      .slice(0, 10)
                      .map((tagItem: any) => (
                        <Link
                          key={tagItem.id}
                          href={`/blog?tag=${tagItem.slug}`}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            tag === tagItem.slug
                              ? 'bg-brand-green text-white dark:bg-brand-green-light'
                              : 'bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-gray dark:text-brand-white/70 hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70'
                          }`}
                        >
                          {tagItem.name}
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Blog Posts Grid */}
            {postsWithTags.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-block p-4 bg-brand-gray/10 dark:bg-brand-navy/50 rounded-full mb-4">
                  <svg
                    className="w-12 h-12 text-brand-gray dark:text-brand-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-xl text-brand-gray dark:text-brand-white/70 mb-4">
                  No blog posts found
                </p>
                {search && (
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Clear search and view all posts
                  </Link>
                )}
              </div>
            ) : (
              <>
                {search && (
                  <div className="mb-6 p-4 bg-brand-blue/5 dark:bg-brand-blue/10 rounded-xl border border-brand-blue/20 dark:border-brand-blue/30">
                    <p className="text-sm text-brand-navy dark:text-brand-white">
                      Found <span className="font-semibold">{postsWithTags.length}</span> result{postsWithTags.length !== 1 ? 's' : ''} for "{search}"
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {postsWithTags.map((post: any, index: number) => (
                    <BlogCard
                      key={post.id}
                      post={post}
                      featured={index === 0}
                      index={index}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-12">
                    {parseInt(page) > 1 && (
                      <Link
                        href={`/blog?${new URLSearchParams({
                          ...(category && { category }),
                          ...(tag && { tag }),
                          ...(search && { search }),
                          page: (parseInt(page) - 1).toString(),
                        })}`}
                        className="group px-6 py-3 bg-white dark:bg-brand-navy-light border-2 border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded-xl hover:border-brand-blue dark:hover:border-brand-blue-light hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10 transition-all duration-300 font-medium flex items-center gap-2"
                      >
                        <svg
                          className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        Previous
                      </Link>
                    )}
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (parseInt(page) <= 3) {
                          pageNum = i + 1
                        } else if (parseInt(page) >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = parseInt(page) - 2 + i
                        }
                        return (
                          <Link
                            key={pageNum}
                            href={`/blog?${new URLSearchParams({
                              ...(category && { category }),
                              ...(tag && { tag }),
                              ...(search && { search }),
                              page: pageNum.toString(),
                            })}`}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                              parseInt(page) === pageNum
                                ? 'bg-brand-blue dark:bg-brand-blue-light text-white shadow-lg scale-110'
                                : 'bg-white dark:bg-brand-navy-light border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white hover:border-brand-blue dark:hover:border-brand-blue-light hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        )
                      })}
                    </div>
                    {parseInt(page) < pagination.totalPages && (
                      <Link
                        href={`/blog?${new URLSearchParams({
                          ...(category && { category }),
                          ...(tag && { tag }),
                          ...(search && { search }),
                          page: (parseInt(page) + 1).toString(),
                        })}`}
                        className="group px-6 py-3 bg-white dark:bg-brand-navy-light border-2 border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded-xl hover:border-brand-blue dark:hover:border-brand-blue-light hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10 transition-all duration-300 font-medium flex items-center gap-2"
                      >
                        Next
                        <svg
                          className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}