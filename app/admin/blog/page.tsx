import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import BlogManagementClient from './BlogManagementClient'

export default async function BlogManagementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/admin/blog')
  }

  // Get user profile to check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'prime_admin' && profile.role !== 'super_admin')) {
    redirect('/admin')
  }

  // Fetch all blog posts (admins can see all statuses)
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      status,
      published_at,
      created_at,
      updated_at,
      view_count,
      reading_time_minutes,
      blog_categories(id, name, slug),
      profiles!blog_posts_author_id_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching blog posts:', error)
  }

  // Get tags for each post
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
  }

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BlogManagementClient initialPosts={postsWithTags || []} />
      </div>
    </div>
  )
}
