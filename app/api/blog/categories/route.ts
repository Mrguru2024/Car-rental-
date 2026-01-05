/**
 * Blog Categories API
 * GET /api/blog/categories - List all categories
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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