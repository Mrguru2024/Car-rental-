/**
 * Blog Categories API
 * GET /api/blog/categories - List all categories
 * POST /api/blog/categories - Create a new category (admin only)
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/utils/roleHierarchy'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    // Get post counts for each category
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

    return NextResponse.json({
      success: true,
      data: categoriesWithCounts,
    })
  } catch (error: any) {
    console.error('Blog categories error:', error)
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
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required' },
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
    const { data: category, error } = await adminSupabase
      .from('blog_categories')
      .insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      // If category already exists, return existing category
      if (error.code === '23505') {
        const { data: existingCategory } = await adminSupabase
          .from('blog_categories')
          .select('*')
          .eq('slug', slug)
          .single()

        if (existingCategory) {
          return NextResponse.json({
            success: true,
            data: existingCategory,
            message: 'Category already exists',
          })
        }
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully',
    })
  } catch (error: any) {
    console.error('Blog category creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}