import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate, formatDateLong } from '@/lib/utils/format'
import { notFound } from 'next/navigation'
import ReadingProgress from '@/components/Blog/ReadingProgress'
import BlogCard from '@/components/Blog/BlogCard'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, meta_title, meta_description, meta_keywords, og_image_url, featured_image_url, published_at, profiles!blog_posts_author_id_fkey(full_name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return {
      title: 'Blog Post Not Found | Carsera',
    }
  }

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt
  const ogImage = post.og_image_url || post.featured_image_url || ''

  return {
    title,
    description,
    keywords: post.meta_keywords || [],
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at,
      authors: Array.isArray(post.profiles) && post.profiles[0]?.full_name 
        ? [post.profiles[0].full_name] 
        : undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
      siteName: 'Carsera',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch post directly from database
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      blog_categories(id, name, slug, description),
      profiles!blog_posts_author_id_fkey(id, full_name)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !post) {
    notFound()
  }

  // Get tags for the post
  const { data: postTags } = await supabase
    .from('blog_post_tags')
    .select(`
      blog_tags(id, name, slug)
    `)
    .eq('post_id', post.id)

  const tags = postTags?.map((pt: any) => pt.blog_tags) || []

  // Increment view count (async, don't wait)
  supabase
    .from('blog_posts')
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq('id', post.id)
    .then(() => {})

  // Get related posts
  const { data: relatedPosts } = await supabase
    .from('blog_posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      featured_image_url,
      published_at,
      reading_time_minutes
    `)
    .eq('status', 'published')
    .eq('category_id', post.category_id)
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(3)

  const postWithTags = {
    ...post,
    tags,
    related_posts: relatedPosts || [],
  }

  // Generate JSON-LD structured data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featured_image_url || post.og_image_url || '',
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: (post.profiles as any)?.full_name || 'Carsera Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Carsera',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/media/images/2.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
    articleSection: (post.blog_categories as any)?.name || 'General',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
        <ReadingProgress />
        <Header />

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <header className="mb-8">
            {post.blog_categories && (
              <Link
                href={`/blog?category=${post.blog_categories.slug}`}
                className="inline-block px-3 py-1 bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light text-sm font-medium rounded-full mb-4 hover:bg-brand-blue/20 dark:hover:bg-brand-blue/30 transition-colors"
              >
                {post.blog_categories.name}
              </Link>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-brand-navy dark:text-brand-white mb-4">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-brand-gray dark:text-brand-white/70 mb-6">
              {post.profiles?.full_name && (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {post.profiles.full_name}
                </span>
              )}
              {post.published_at && (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDateLong(new Date(post.published_at))}
                </span>
              )}
              {post.reading_time_minutes && (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {post.reading_time_minutes} min read
                </span>
              )}
              {post.view_count > 0 && (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {post.view_count} views
                </span>
              )}
            </div>
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: any) => (
                  <Link
                    key={tag.id}
                    href={`/blog?tag=${tag.slug}`}
                    className="px-3 py-1 bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-gray dark:text-brand-white/70 rounded-full text-sm hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70 transition-colors"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* Featured Image */}
          {post.featured_image_url && (
            <div className="relative w-full h-64 md:h-96 mb-8 rounded-2xl overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
              <Image
                src={post.featured_image_url}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-12 blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Share Buttons */}
          <div className="border-t border-brand-gray/20 dark:border-brand-navy/50 pt-8 mb-12">
            <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-white mb-6">
              Share this post
            </h3>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group px-6 py-3 bg-[#1DA1F2] text-white rounded-xl hover:bg-[#1a8cd8] transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                <span className="font-medium">Twitter</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group px-6 py-3 bg-[#1877F2] text-white rounded-xl hover:bg-[#166fe5] transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="font-medium">Facebook</span>
              </a>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/blog/${post.slug}`)}&title=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group px-6 py-3 bg-[#0A66C2] text-white rounded-xl hover:bg-[#095195] transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span className="font-medium">LinkedIn</span>
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/blog/${post.slug}`)
                  // You could add a toast notification here
                }}
                className="group px-6 py-3 bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white rounded-xl hover:bg-brand-gray/20 dark:hover:bg-brand-navy/70 transition-all duration-300 flex items-center gap-2 border border-brand-gray/20 dark:border-brand-navy/50 hover:border-brand-blue dark:hover:border-brand-blue-light"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Copy Link</span>
              </button>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <div className="border-t border-brand-gray/20 dark:border-brand-navy/50 pt-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-gray/20 dark:via-brand-navy/50 to-transparent" />
                <h3 className="text-2xl font-bold text-brand-navy dark:text-brand-white">
                  Related Posts
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-gray/20 dark:via-brand-navy/50 to-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost: any, index: number) => (
                  <BlogCard
                    key={relatedPost.id}
                    post={{
                      ...relatedPost,
                      blog_categories: post.blog_categories
                        ? {
                            name: (post.blog_categories as any).name,
                            slug: (post.blog_categories as any).slug,
                          }
                        : null,
                    }}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <div className="mt-12 text-center">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-blue to-brand-green dark:from-brand-blue-light dark:to-brand-green text-white rounded-xl hover:shadow-lg hover:shadow-brand-blue/30 transition-all duration-300 font-medium hover:scale-105"
            >
              <svg
                className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Blog
            </Link>
          </div>
        </article>

        <Footer />
      </div>
    </>
  )
}