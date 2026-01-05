import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Layout/Header'
import BlogEditorClient from '../BlogEditorClient'

export default async function NewBlogPostPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?redirect=/admin/blog/new')
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

  // Fetch categories and tags for the editor
  const [categoriesResponse, tagsResponse] = await Promise.all([
    supabase.from('blog_categories').select('*').order('name', { ascending: true }),
    supabase.from('blog_tags').select('*').order('name', { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-brand-white dark:bg-brand-navy text-brand-navy dark:text-brand-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BlogEditorClient
          categories={categoriesResponse.data || []}
          tags={tagsResponse.data || []}
        />
      </div>
    </div>
  )
}
