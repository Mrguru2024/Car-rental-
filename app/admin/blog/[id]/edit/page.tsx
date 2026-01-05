import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import BlogEditorClient from '../../BlogEditorClient'
import { notFound } from 'next/navigation'

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?redirect=/admin/blog/${id}/edit`)
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

  // Fetch the blog post
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

  // Fetch categories and all tags for the editor
  const [categoriesResponse, allTagsResponse] = await Promise.all([
    supabase.from('blog_categories').select('*').order('name', { ascending: true }),
    supabase.from('blog_tags').select('*').order('name', { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BlogEditorClient
          postId={id}
          initialData={{
            ...post,
            tags,
          }}
          categories={categoriesResponse.data || []}
          tags={allTagsResponse.data || []}
        />
      </div>
    </div>
  )
}
