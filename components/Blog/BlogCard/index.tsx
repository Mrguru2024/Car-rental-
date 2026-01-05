'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils/format'
import { useState } from 'react'

interface BlogCardProps {
  post: {
    id: string
    title: string
    slug: string
    excerpt: string
    featured_image_url?: string | null
    published_at?: string | null
    reading_time_minutes?: number | null
    view_count?: number
    blog_categories?: {
      name: string
      slug: string
    } | null
    tags?: Array<{ id: string; name: string; slug: string }>
  }
  featured?: boolean
  index?: number
}

export default function BlogCard({ post, featured = false, index = 0 }: BlogCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <article
      className={`group relative bg-white dark:bg-brand-navy-light rounded-2xl shadow-lg dark:shadow-brand-navy/30 overflow-hidden border border-brand-white dark:border-brand-navy/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-blue/10 dark:hover:shadow-brand-blue/20 hover:-translate-y-2 ${
        featured ? 'md:col-span-2' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
      }}
    >
      <Link href={`/blog/${post.slug}`} className="block">
        {post.featured_image_url && (
          <div
            className={`relative ${featured ? 'h-64 md:h-80' : 'h-48 md:h-56'} w-full overflow-hidden bg-gradient-to-br from-brand-blue/20 to-brand-green/20`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 transition-opacity duration-500 ${
                isHovered ? 'opacity-100' : 'opacity-70'
              }`}
            />
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className={`object-cover transition-transform duration-700 ${
                isHovered ? 'scale-110' : 'scale-100'
              } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              priority={index < 3}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-green/20 animate-pulse" />
            )}
            {post.blog_categories && (
              <div className="absolute top-4 left-4 z-20">
                <span className="inline-block px-4 py-2 bg-white/90 dark:bg-brand-navy/90 backdrop-blur-sm text-brand-blue dark:text-brand-blue-light text-sm font-semibold rounded-full shadow-lg transform transition-transform duration-300 group-hover:scale-105">
                  {post.blog_categories.name}
                </span>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <h2
                className={`font-bold text-white mb-2 drop-shadow-lg transition-all duration-300 ${
                  featured
                    ? 'text-2xl md:text-3xl lg:text-4xl'
                    : 'text-xl md:text-2xl'
                } ${isHovered ? 'translate-y-0' : 'translate-y-2'}`}
              >
                {post.title}
              </h2>
            </div>
          </div>
        )}
        {!post.featured_image_url && (
          <div className="p-6 pb-4">
            {post.blog_categories && (
              <span className="inline-block px-4 py-2 bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light text-sm font-semibold rounded-full mb-4">
                {post.blog_categories.name}
              </span>
            )}
            <h2
              className={`font-bold text-brand-navy dark:text-brand-white mb-3 transition-colors duration-300 group-hover:text-brand-blue dark:group-hover:text-brand-blue-light ${
                featured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
              }`}
            >
              {post.title}
            </h2>
          </div>
        )}
        <div className={`p-6 ${post.featured_image_url ? 'pt-4' : ''}`}>
          {post.featured_image_url && (
            <h2
              className={`font-bold text-brand-navy dark:text-brand-white mb-3 transition-colors duration-300 group-hover:text-brand-blue dark:group-hover:text-brand-blue-light ${
                featured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
              }`}
            >
              {post.title}
            </h2>
          )}
          <p className="text-brand-gray dark:text-brand-white/70 mb-4 line-clamp-3 leading-relaxed">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-brand-gray dark:text-brand-white/60">
              {post.published_at && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDate(new Date(post.published_at))}
                </span>
              )}
              {post.reading_time_minutes && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {post.reading_time_minutes} min
                </span>
              )}
              {post.view_count && post.view_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  {post.view_count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-brand-blue dark:text-brand-blue-light font-medium group-hover:gap-3 transition-all duration-300">
              <span className="text-sm">Read more</span>
              <svg
                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
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
            </div>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-brand-gray/10 dark:border-brand-navy/50">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2.5 py-1 bg-brand-gray/5 dark:bg-brand-navy/50 text-brand-gray dark:text-brand-white/60 rounded-full text-xs font-medium hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors duration-200"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </article>
  )
}
