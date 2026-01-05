import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils/format'

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
        postsWithTags = postsWithTags.filter(post => {
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
      <div className="bg-gradient-to-r from-brand-blue/10 via-brand-green/10 to-brand-blue/10 dark:from-brand-blue/20 dark:via-brand-green/20 dark:to-brand-blue/20 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-navy dark:text-brand-white mb-6">
              Carsera Blog
            </h1>
            <p className="text-xl md:text-2xl text-brand-gray dark:text-brand-white/70 max-w-3xl mx-auto">
              Expert tips, travel guides, and insights to help you get the most out of car rentals
            </p>
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
            {/* Search Bar */}
            <form method="GET" action="/blog" className="mb-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Search blog posts..."
                  className="flex-1 px-4 py-3 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Search
                </button>
                {search && (
                  <Link
                    href="/blog"
                    className="px-4 py-3 bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70 transition-colors"
                  >
                    Clear
                  </Link>
                )}
              </div>
            </form>

            {/* Blog Posts Grid */}
            {postsWithTags.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-brand-gray dark:text-brand-white/70 mb-4">
                  No blog posts found
                </p>
                <Link
                  href="/blog"
                  className="text-brand-blue dark:text-brand-blue-light hover:underline"
                >
                  View all posts
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {postsWithTags.map((post: any, index: number) => (
                    <article
                      key={post.id}
                      className={`bg-white dark:bg-brand-navy-light rounded-xl shadow-md dark:shadow-brand-navy/30 overflow-hidden border border-brand-white dark:border-brand-navy/50 hover:shadow-lg dark:hover:shadow-brand-navy/50 transition-all ${
                        index === 0 ? 'md:col-span-2' : ''
                      }`}
                    >
                      <Link href={`/blog/${post.slug}`} className="block">
                        {post.featured_image_url && (
                          <div className={`relative ${index === 0 ? 'h-64' : 'h-48'} w-full overflow-hidden`}>
                            <Image
                              src={post.featured_image_url}
                              alt={post.title}
                              fill
                              className="object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          {post.blog_categories && (
                            <span className="inline-block px-3 py-1 bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light text-sm font-medium rounded-full mb-3">
                              {post.blog_categories.name}
                            </span>
                          )}
                          <h2 className={`font-bold text-brand-navy dark:text-brand-white mb-3 hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors ${
                            index === 0 ? 'text-2xl md:text-3xl' : 'text-xl'
                          }`}>
                            {post.title}
                          </h2>
                          <p className="text-brand-gray dark:text-brand-white/70 mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-sm text-brand-gray dark:text-brand-white/50">
                            <div className="flex items-center gap-4">
                              {post.published_at && (
                                <span>{formatDate(new Date(post.published_at))}</span>
                              )}
                              {post.reading_time_minutes && (
                                <span>{post.reading_time_minutes} min read</span>
                              )}
                            </div>
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {post.tags.slice(0, 2).map((tag: any) => (
                                  <span
                                    key={tag.id}
                                    className="px-2 py-1 bg-brand-gray/10 dark:bg-brand-navy/50 rounded text-xs"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    {parseInt(page) > 1 && (
                      <Link
                        href={`/blog?${new URLSearchParams({
                          ...(category && { category }),
                          ...(tag && { tag }),
                          ...(search && { search }),
                          page: (parseInt(page) - 1).toString(),
                        })}`}
                        className="px-4 py-2 bg-white dark:bg-brand-navy-light border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/70 transition-colors"
                      >
                        Previous
                      </Link>
                    )}
                    <span className="px-4 py-2 text-brand-gray dark:text-brand-white/70">
                      Page {page} of {pagination.totalPages}
                    </span>
                    {parseInt(page) < pagination.totalPages && (
                      <Link
                        href={`/blog?${new URLSearchParams({
                          ...(category && { category }),
                          ...(tag && { tag }),
                          ...(search && { search }),
                          page: (parseInt(page) + 1).toString(),
                        })}`}
                        className="px-4 py-2 bg-white dark:bg-brand-navy-light border border-brand-gray/20 dark:border-brand-navy/50 text-brand-navy dark:text-brand-white rounded-lg hover:bg-brand-gray/10 dark:hover:bg-brand-navy/70 transition-colors"
                      >
                        Next
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