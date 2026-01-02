import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') || '/onboarding'

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin))
  }

  // Exchange code for session (for OAuth and email confirmation)
  if (!code) {
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/auth?error=Configuration error', requestUrl.origin))
  }

  // Create response object for cookie handling
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (exchangeError) {
    console.error('Error exchanging code for session:', exchangeError)
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin))
  }

  // Determine redirect URL based on user profile
  let redirectUrl = next
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, verification_status')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (profile) {
      if (profile.role === 'renter') {
        redirectUrl = profile.verification_status === 'approved' ? '/renter' : '/renter/verification'
      } else if (profile.role === 'dealer' || profile.role === 'private_host') {
        redirectUrl = profile.verification_status === 'approved' ? '/dealer' : '/dealer/verification'
      } else if (profile.role === 'admin') {
        redirectUrl = '/admin'
      }
    }
  }

  // Create redirect response and copy cookies with their options
  const redirectResponse = NextResponse.redirect(new URL(redirectUrl, requestUrl.origin))
  
  // Copy all cookies from the exchange response to the redirect response
  // The cookies were set by Supabase via setAll callback
  const allCookies = response.cookies.getAll()
  allCookies.forEach((cookie) => {
    // Get the full cookie object to preserve options
    const cookieObj = response.cookies.get(cookie.name)
    if (cookieObj) {
      redirectResponse.cookies.set(cookie.name, cookieObj.value, {
        httpOnly: cookieObj.httpOnly,
        secure: cookieObj.secure,
        sameSite: cookieObj.sameSite as any,
        path: cookieObj.path || '/',
        maxAge: cookieObj.maxAge,
        expires: cookieObj.expires,
      })
    } else {
      // Fallback if cookie object not available
      redirectResponse.cookies.set(cookie.name, cookie.value)
    }
  })
  
  return redirectResponse
}
