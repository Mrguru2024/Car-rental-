import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Apply security headers to response (inline to avoid Edge Runtime import issues)
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.opencagedata.com https://maps.googleapis.com; frame-src https://js.stripe.com https://hooks.stripe.com;"
  )

  // X-Frame-Options: Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // X-Content-Type-Options: Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // X-XSS-Protection: Enable XSS filtering
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer-Policy: Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), payment=(self)'
  )

  // Strict-Transport-Security: Force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Get user - this will automatically refresh the session if needed
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

  // Onboarding path - allow authenticated users without profiles (check before auth requirement)
  const isOnboardingPath = request.nextUrl.pathname === '/onboarding' || request.nextUrl.pathname.startsWith('/onboarding/')
  if (isOnboardingPath && user) {
    return applySecurityHeaders(supabaseResponse)
  }

  // Require authentication for all other paths
  if (!user) {
    // Don't redirect if already on auth page to prevent loops
    if (request.nextUrl.pathname === '/auth') {
      return applySecurityHeaders(supabaseResponse)
    }
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
    .maybeSingle()

  const userRole = profile?.role || null

  // Admin-only paths (admin, prime_admin, and super_admin can access)
  const adminPaths = ['/admin']
  const isAdminPath = adminPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  // Prime Admin-only paths (prime_admin and super_admin can access)
  const primeAdminPaths = ['/admin/document-audit']
  const isPrimeAdminPath = primeAdminPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  // Super Admin-only paths (only super_admin can access)
  const superAdminPaths = ['/admin/dev', '/admin/system']
  const isSuperAdminPath = superAdminPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  if (isSuperAdminPath && userRole !== 'super_admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (isPrimeAdminPath && userRole !== 'prime_admin' && userRole !== 'super_admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (isAdminPath && userRole !== 'admin' && userRole !== 'prime_admin' && userRole !== 'super_admin') {
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