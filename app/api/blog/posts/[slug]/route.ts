/**
 * Blog Post Detail API
 * GET /api/blog/posts/[slug] - Get single blog post by slug
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/utils/roleHierarchy'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { slug } = await params

    // Get user profile to check if admin (can view drafts)
    let isUserAdmin = false
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      isUserAdmin = profile ? isAdmin(profile.role) : false
    }

    // Build query - admins can see drafts, others only published
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories(id, name, slug, description),
        profiles!blog_posts_author_id_fkey(id, full_name)
      `)
      .eq('slug', slug)

    if (!isUserAdmin) {
      query = query.eq('status', 'published')
    }

    const { data: post, error } = await query.single()

    if (error || !post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
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
    if (post.status === 'published') {
      supabase
        .from('blog_posts')
        .update({ view_count: (post.view_count || 0) + 1 })
        .eq('id', post.id)
        .then(() => {}) // Fire and forget
    }

    // Get related posts (same category, excluding current post)
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

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        tags,
        related_posts: relatedPosts || [],
      },
    })
  } catch (error: any) {
    console.error('Blog post detail error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}