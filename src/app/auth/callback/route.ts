import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    const requestedNext = request.nextUrl.searchParams.get('next') || '/portal/dashboard'
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
        ? requestedNext
        : '/portal/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin))
    }

    return NextResponse.redirect(new URL('/portal?auth_error=1', request.nextUrl.origin))
}
