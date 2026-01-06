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
      <div className="w-full max-w-[1600px] mx-auto px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-6 xs:py-8 sm:py-10 md:py-12 lg:py-14 flex flex-col items-center">
        <div className="w-full">
          <BlogEditorClient
            categories={categoriesResponse.data || []}
            tags={tagsResponse.data || []}
          />
        </div>
      </div>
    </div>
  )
}
