import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/securityHeaders'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow static media files to pass through
  if (
    request.nextUrl.pathname.startsWith('/media/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico')
  ) {
    return supabaseResponse
  }

  // Public pages that don't require authentication
  const publicPaths = [
    '/',
    '/auth',
    '/auth/callback', // OAuth callback
    '/listings', // Includes /listings/[id] for individual vehicle pages
    '/faq',
    '/privacy',
    '/terms',
    '/dealer-agreement',
    '/about',
    '/investors',
  ]

  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  // API routes that don't require authentication (webhooks, public endpoints)
  const publicApiPaths = [
    '/api/stripe/webhook', // Stripe webhook (verified by signature)
  ]

  const isPublicApiPath = publicApiPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  // Allow public paths and public API paths
  if (isPublicPath || isPublicApiPath) {
    return applySecurityHeaders(supabaseResponse)
  }

  // Require authentication for all other paths
  if (!user) {
    // Redirect to auth with return URL
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Role-based access control for protected paths
  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const userRole = profile?.role || null

  // Admin-only paths
  const adminPaths = ['/admin']
  const isAdminPath = adminPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  if (isAdminPath && userRole !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Dealer-only paths
  const dealerPaths = ['/dealer']
  const isDealerPath = dealerPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  if (isDealerPath && userRole !== 'dealer' && userRole !== 'private_host') {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // Renter-only paths
  const renterPaths = ['/renter']
  const isRenterPath = renterPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  if (isRenterPath && userRole !== 'renter') {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  // Apply security headers
  return applySecurityHeaders(supabaseResponse)
}