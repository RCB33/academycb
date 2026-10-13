import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    const path = new URL(request.url).searchParams.get('path')
    if (!path || path.includes('..') || path.startsWith('/') || path.length > 512) return new Response(null, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(null, { status: 401 })
    const storedUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile_images/${path}`
    // RLS must authorize an actual record referencing the image before elevated storage access.
    const checks = await Promise.all(['children', 'workers', 'profiles'].map(table =>
        supabase.from(table).select('id').eq('avatar_url', storedUrl).limit(1)
    ))
    if (!checks.some(result => !result.error && result.data?.length)) return new Response(null, { status: 403 })
    const { data, error } = await createAdminClient().storage.from('profile_images').download(path)
    if (error || !data) return new Response(null, { status: 404 })
    return new Response(data, { headers: { 'Content-Type': data.type || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
}
