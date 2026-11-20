import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
    let access
    try{access=await requireRole(['guardian','admin'])}catch{return new Response(null,{status:403})}
    const {id}=await params
    if(!z.string().uuid().safeParse(id).success)return new Response(null,{status:400})
    // RLS first: individually assigned clips never inherit the category audience.
    const {data:asset,error}=await access.supabase.from('media_assets').select('video_url').eq('id',id).eq('media_type','video').maybeSingle()
    if(error||!asset?.video_url)return new Response(null,{status:404})
    let url=asset.video_url
    if(url.startsWith('storage:')) {
        const path=url.slice(8)
        if(!/^(child|team|category)\/[0-9a-f-]{36}\//i.test(path)||path.includes('..'))return new Response(null,{status:404})
        const {data:signed,error:signError}=await createAdminClient().storage.from('videos').createSignedUrl(path,300)
        if(signError||!signed)return new Response(null,{status:404})
        url=signed.signedUrl
    }
    try{if(!['https:','http:'].includes(new URL(url).protocol))return new Response(null,{status:404})}catch{return new Response(null,{status:404})}
    return Response.json({url},{headers:{'Cache-Control':'private, no-store'}})
}
