import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessAdminPath, getRoleHome, isAppRole } from '@/lib/roles'

// Routes that don't require any authentication
const PUBLIC_ROUTES = [
  '/',
  '/academia',
  '/campus',
  '/torneos',
  '/tienda',
  '/contacto',
  '/inscripcion',
  '/portal/establecer-contrasena',
  '/terminos',
  '/aviso-legal',
  '/privacidad',
  '/cookies',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]

// Prefixes that are always public
const PUBLIC_PREFIXES = [
  '/player/public/',
  '/torneos/',
  '/api/',
  '/auth/',
  '/_next/',
  '/favicon.ico',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it hard
  // to debug random user logouts.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // --- Check if route is public ---
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )
  const isStaticAsset = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|pdf)$/.test(pathname)

  if (isPublicRoute || isPublicPrefix || isStaticAsset) {
    return supabaseResponse
  }

  // --- Portal login page: /portal (exact) is the login page ---
  if (pathname === '/portal') {
    // If already logged in, redirect to dashboard
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      const url = request.nextUrl.clone()
      url.pathname = getRoleHome(isAppRole(profile?.role) ? profile.role : null)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // --- From here, all routes require authentication ---
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/portal'
    return NextResponse.redirect(url)
  }

  // --- Internal routes: every role receives only its explicit work area ---
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = isAppRole(profile?.role) ? profile.role : null
    if (!canAccessAdminPath(role, pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHome(role)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // --- Coach routes: only assigned coaches and administrators ---
  if (pathname.startsWith('/coach')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['coach', 'admin']
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHome(isAppRole(profile?.role) ? profile.role : null)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // --- Family portal: internal workers must not fall into the guardian UI ---
  if (pathname.startsWith('/portal/')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = isAppRole(profile?.role) ? profile.role : null
    if (role && role !== 'guardian') {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHome(role)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
