/**
 * Blog Posts API
 * GET /api/blog/posts - List published blog posts
 * POST /api/blog/posts - Create blog post (admin only)
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/utils/roleHierarchy'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    let query = supabase
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

    // Filter by category
    if (category) {
      query = query.eq('blog_categories.slug', category)
    }

    // Note: Tag filtering will be done in application logic after fetching posts

    // Search functionality
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data: posts, error, count } = await query

    if (error) {
      throw error
    }

    // Get tags for each post
    const postIds = posts?.map(p => p.id) || []
    let postsWithTags: Array<any & { tags: Array<{ id: string; name: string; slug: string }> }> = []

    if (postIds.length > 0) {
      const { data: postTags } = await supabase
        .from('blog_post_tags')
        .select(`
          post_id,
          blog_tags(id, name, slug)
        `)
        .in('post_id', postIds)

      // Group tags by post_id
      const tagsByPostId = new Map<string, any[]>()
      postTags?.forEach((pt: any) => {
        if (!tagsByPostId.has(pt.post_id)) {
          tagsByPostId.set(pt.post_id, [])
        }
        tagsByPostId.get(pt.post_id)?.push(pt.blog_tags)
      })

      // Add tags to posts
      postsWithTags = (posts || []).map((post: any) => ({
        ...post,
        tags: tagsByPostId.get(post.id) || [],
      }))

      // Filter by tag if specified (after fetching posts)
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
    } else {
      postsWithTags = (posts || []).map((post: any) => ({
        ...post,
        tags: [],
      }))
    }

    return NextResponse.json({
      success: true,
      data: postsWithTags,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Blog posts list error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !isAdmin(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      category_id,
      tag_ids,
      meta_title,
      meta_description,
      meta_keywords,
      og_image_url,
      status,
      published_at,
    } = body

    // Validate required fields
    if (!title || !slug || !excerpt || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug, excerpt, content' },
        { status: 400 }
      )
    }

    // Calculate reading time
    const adminSupabase = createAdminClient()
    const { data: readingTimeResult } = await adminSupabase.rpc('calculate_reading_time', {
      content_text: content,
    })

    const reading_time_minutes = readingTimeResult || 5

    // Create blog post
    const { data: post, error: postError } = await adminSupabase
      .from('blog_posts')
      .insert({
        title,
        slug,
        excerpt,
        content,
        featured_image_url,
        author_id: profile.id,
        category_id,
        meta_title,
        meta_description,
        meta_keywords: meta_keywords || [],
        og_image_url: og_image_url || featured_image_url,
        status: status || 'draft',
        published_at: status === 'published' ? (published_at || new Date().toISOString()) : null,
        reading_time_minutes,
      })
      .select()
      .single()

    if (postError) {
      throw postError
    }

    // Add tags if provided
    if (tag_ids && tag_ids.length > 0) {
      const tagInserts = tag_ids.map((tagId: string) => ({
        post_id: post.id,
        tag_id: tagId,
      }))

      const { error: tagsError } = await adminSupabase
        .from('blog_post_tags')
        .insert(tagInserts)

      if (tagsError) {
        console.error('Error adding tags:', tagsError)
        // Don't fail the request if tags fail
      }
    }

    return NextResponse.json({
      success: true,
      data: post,
      message: 'Blog post created successfully',
    })
  } catch (error: any) {
    console.error('Blog post creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}