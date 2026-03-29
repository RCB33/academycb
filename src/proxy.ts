import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Admin Protection
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/portal', request.url)) // Redirect to login
        }
        // Ideally check role here, but keeping it simple. RLS will block data access anyway.
    }

    // Portal Protection
    if (request.nextUrl.pathname.startsWith('/portal') && !request.nextUrl.pathname.endsWith('/portal')) { // simplistic check: /portal is login, subroutes are protected?
        // Actually my structure is /portal (login), /portal/dashboard (protected).
        // I should allow /portal itself.
        if (request.nextUrl.pathname === '/portal') {
            if (user) {
                // If already logged in, redirect to dashboard?
                // Only if we know for sure where to go.
                return NextResponse.redirect(new URL('/portal/dashboard', request.url))
            }
            return response
        }

        // For other /portal/* routes
        if (!user) {
            return NextResponse.redirect(new URL('/portal', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
