import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    let access
    try { access = await requireRole(['admin','guardian']) } catch { return new Response(null, { status: 403 }) }
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return new Response(null, { status: 400 })
    const { data: image, error } = await access.supabase.from('media_assets').select('child_id,url').eq('id', id).eq('media_type','image').maybeSingle()
    if (error || !image?.child_id || !image.url) return new Response(null, { status: 404 })
    // Explicit child authorization also excludes assets visible only through a category.
    const { data: child } = await access.supabase.from('children').select('id').eq('id',image.child_id).is('archived_at',null).maybeSingle()
    if (!child) return new Response(null, { status: 404 })
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/`
    const path = image.url.startsWith(base) ? image.url.slice(base.length) : image.url
    if (path.startsWith('http') || !path.startsWith(`${child.id}/`) || path.includes('..')) return new Response(null, { status: 404 })
    const { data, error: storageError } = await createAdminClient().storage.from('gallery').download(path)
    if (storageError || !data) return new Response(null, { status: 404 })
    return new Response(data, { headers: { 'Content-Type': data.type || 'image/webp', 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' } })
}
