/**
 * Blog Tags API
 * GET /api/blog/tags - List all tags
 * POST /api/blog/tags - Create a new tag (admin only)
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/utils/roleHierarchy'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: tags, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    // Get post counts for each tag
    const { data: postTags } = await supabase
      .from('blog_post_tags')
      .select('tag_id')

    const countsByTag = new Map<string, number>()
    postTags?.forEach((pt) => {
      countsByTag.set(pt.tag_id, (countsByTag.get(pt.tag_id) || 0) + 1)
    })

    const tagsWithCounts = tags?.map((tag) => ({
      ...tag,
      post_count: countsByTag.get(tag.id) || 0,
    })) || []

    return NextResponse.json({
      success: true,
      data: tagsWithCounts,
    })
  } catch (error: any) {
    console.error('Blog tags error:', error)
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
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    const adminSupabase = createAdminClient()
    const { data: tag, error } = await adminSupabase
      .from('blog_tags')
      .insert({
        name: name.trim(),
        slug,
      })
      .select()
      .single()

    if (error) {
      // If tag already exists, return existing tag
      if (error.code === '23505') {
        const { data: existingTag } = await adminSupabase
          .from('blog_tags')
          .select('*')
          .eq('slug', slug)
          .single()

        if (existingTag) {
          return NextResponse.json({
            success: true,
            data: existingTag,
            message: 'Tag already exists',
          })
        }
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: tag,
      message: 'Tag created successfully',
    })
  } catch (error: any) {
    console.error('Blog tag creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
