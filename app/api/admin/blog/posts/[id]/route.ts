/**
 * Blog Post by ID API (Admin Only)
 * GET /api/admin/blog/posts/[id] - Get blog post by ID
 * PUT /api/admin/blog/posts/[id] - Update blog post
 * DELETE /api/admin/blog/posts/[id] - Delete blog post
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/utils/roleHierarchy'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const { id } = await params

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories(id, name, slug),
        profiles!blog_posts_author_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .single()

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

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        tags,
      },
    })
  } catch (error: any) {
    console.error('Blog post get error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const { id } = await params
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

    // Update blog post
    const { data: post, error: postError } = await adminSupabase
      .from('blog_posts')
      .update({
        title,
        slug,
        excerpt,
        content,
        featured_image_url,
        category_id,
        meta_title,
        meta_description,
        meta_keywords: meta_keywords || [],
        og_image_url: og_image_url || featured_image_url,
        status: status || 'draft',
        published_at: status === 'published' ? (published_at || new Date().toISOString()) : null,
        reading_time_minutes,
      })
      .eq('id', id)
      .select()
      .single()

    if (postError) {
      throw postError
    }

    // Update tags - delete existing and insert new ones
    if (tag_ids !== undefined) {
      // Delete existing tags
      await adminSupabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', id)

      // Insert new tags
      if (tag_ids && tag_ids.length > 0) {
        const tagInserts = tag_ids.map((tagId: string) => ({
          post_id: id,
          tag_id: tagId,
        }))

        const { error: tagsError } = await adminSupabase
          .from('blog_post_tags')
          .insert(tagInserts)

        if (tagsError) {
          console.error('Error updating tags:', tagsError)
          // Don't fail the request if tags fail
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: post,
      message: 'Blog post updated successfully',
    })
  } catch (error: any) {
    console.error('Blog post update error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const { id } = await params

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Blog post deleted successfully',
    })
  } catch (error: any) {
    console.error('Blog post delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
