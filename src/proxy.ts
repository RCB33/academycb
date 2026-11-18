import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Camping belongs to the separate Costa Brava Cup site, never to Academy.
  if (request.nextUrl.pathname === '/camping' || request.nextUrl.pathname.startsWith('/camping/')) {
    return new NextResponse(null, { status: 404 })
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|mp3|m4a|wav)$).*)',
  ],
}
