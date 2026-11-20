'use server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requirePlayerPhotoAccess } from '@/lib/player-photo-access'
import { getFamilyContext } from '@/lib/family-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminReadAll } from '@/lib/admin-read-all'
import { FAMILY_VIDEO_LIMIT, FAMILY_VIDEO_TYPES, videoFileIsValid, type FamilyMediaItem } from '@/lib/family-media'

export async function getFamilyMedia():Promise<FamilyMediaItem[]> {
    const family=await getFamilyContext()
    if(!family?.children.length) return []
    const db=await createClient(), ids=family.children.map(c=>c.id)
    const [{data:children,error:childError},{data:groups},{data:assets}]=await Promise.all([
        db.from('children').select('id,team_id,category_id').in('id',ids),
        adminReadAll((f,t)=>db.from('academy_group_assignments').select('child_id,team_id').in('child_id',ids).order('child_id').order('team_id').range(f,t)),
        adminReadAll((f,t)=>db.from('media_assets').select('id,child_id,team_id,category_id,title,description,media_type,url,video_url,created_at,created_by').order('created_at',{ascending:false}).order('id').range(f,t)),
    ])
    if(childError) throw Error('No se pudo cargar la galería.')
    const authorIds=[...new Set(assets.map(a=>a.created_by).filter((id):id is string=>!!id))]
    // Only classify authors of already-authorized assets; never expose their profiles.
    const authors=authorIds.length ? await createAdminClient().from('profiles').select('id,role').in('id',authorIds) : {data:[],error:null}
    if(authors.error)throw Error('No se pudo cargar la galería.')
    const familyAuthors=new Set((authors.data||[]).filter(p=>p.role==='guardian').map(p=>p.id))
    return assets.flatMap(a=>{
        const childIds=(children||[]).filter(c=>a.child_id ? a.child_id===c.id : a.team_id ? a.team_id===c.team_id||groups.some(g=>g.child_id===c.id&&g.team_id===a.team_id) : a.category_id&&a.category_id===c.category_id).map(c=>c.id)
        if(!childIds.length || !['image','video'].includes(a.media_type) || (a.media_type==='image'?!a.url:!a.video_url))return []
        return [{id:a.id,title:a.title,description:a.description,type:a.media_type as 'image'|'video',url:a.media_type==='image'?`/api/player-gallery/${a.id}`:`/api/family-video/${a.id}`,createdAt:a.created_at,childIds,childId:a.child_id,source:familyAuthors.has(a.created_by)?'family' as const:'academy' as const,audience:a.child_id?family.children.find(c=>c.id===a.child_id)?.full_name||'Jugador':a.team_id?'Equipo':'Categoría',canDelete:!!a.child_id&&a.created_by===family.userId}]
    })
}

export async function prepareFamilyVideo(input:{childId:string;mime:string;size:number}) {
    try {
        const parsed=z.object({childId:z.string().uuid(),mime:z.enum(['video/mp4','video/webm','video/quicktime']),size:z.number().int().min(12).max(FAMILY_VIDEO_LIMIT)}).parse(input)
        const {user}=await requirePlayerPhotoAccess(parsed.childId)
        const path=`child/${parsed.childId}/${user.id}/${randomUUID()}.${FAMILY_VIDEO_TYPES[parsed.mime]}`
        const {data,error}=await createAdminClient().storage.from('videos').createSignedUploadUrl(path)
        if(error||!data)throw Error('No se pudo preparar la subida del vídeo.')
        return {path,token:data.token}
    } catch(error){return {error:error instanceof z.ZodError?'Elige un vídeo MP4, WebM o MOV de hasta 20 MB.':error instanceof Error?error.message:'No se pudo preparar el vídeo.'}}
}

export async function finishFamilyVideo(input:{childId:string;path:string;title:string}) {
    try {
        const {childId,path,title}=z.object({childId:z.string().uuid(),path:z.string().max(300),title:z.string().trim().min(1).max(150)}).parse(input)
        const {user}=await requirePlayerPhotoAccess(childId)
        const prefix=`child/${childId}/${user.id}/`
        const file=path.startsWith(prefix)?path.slice(prefix.length):''
        const match=file.match(/^([0-9a-f-]{36})\.(mp4|webm|mov)$/)
        if(!match||!z.string().uuid().safeParse(match[1]).success)throw Error('Vídeo no válido.')
        const admin=createAdminClient(), bucket=admin.storage.from('videos')
        const {data:existing,error:existingError}=await admin.from('media_assets').select('id,video_url,child_id,created_by').eq('id',match[1]).maybeSingle()
        if(existingError)throw Error('No se pudo comprobar el vídeo.')
        if(existing) {
            if(existing.video_url===`storage:${path}`&&existing.child_id===childId&&existing.created_by===user.id)return {success:true}
            throw Error('Vídeo no válido.')
        }
        const {data:info,error:infoError}=await bucket.info(path)
        if(infoError||!info)throw Error('No se ha completado la subida. Inténtalo de nuevo.')
        const mime=Object.keys(FAMILY_VIDEO_TYPES).find(m=>FAMILY_VIDEO_TYPES[m]===match[2])!
        if(!Number.isFinite(info.size)||Number(info.size)>FAMILY_VIDEO_LIMIT||Number(info.size)<12||info.contentType!==mime) {
            await bucket.remove([path]);throw Error('Elige un vídeo MP4, WebM o MOV de hasta 20 MB.')
        }
        const {data:blob,error:downloadError}=await bucket.download(path)
        if(downloadError||!blob)throw Error('No se pudo comprobar el archivo de vídeo.')
        if(blob.size>FAMILY_VIDEO_LIMIT||!videoFileIsValid(new Uint8Array(await blob.arrayBuffer()),mime)){
            await bucket.remove([path]);throw Error('El contenido del archivo no es un vídeo compatible.')
        }
        await requirePlayerPhotoAccess(childId)
        const {error}=await admin.from('media_assets').insert({id:match[1],child_id:childId,title,video_url:`storage:${path}`,media_type:'video',context:'academia',created_by:user.id})
        if(error)throw Error('No se pudo guardar el vídeo. Puedes volver a intentarlo.')
        revalidatePath('/portal/videoteca');revalidatePath(`/portal/${childId}`);revalidatePath('/admin/videoteca')
        return {success:true}
    }catch(error){return {error:error instanceof z.ZodError?'Revisa el título y el jugador.':error instanceof Error?error.message:'No se pudo guardar el vídeo.'}}
}

export async function deleteFamilyVideo(id:string,childId:string) {
    try {
        z.string().uuid().parse(id)
        const {supabase,role,user}=await requirePlayerPhotoAccess(childId)
        const {data:asset,error}=await supabase.from('media_assets').select('id,video_url,created_by').eq('id',id).eq('child_id',childId).eq('media_type','video').maybeSingle()
        if(error||!asset||(role!=='admin'&&asset.created_by!==user.id))throw Error('No puedes eliminar este vídeo.')
        const admin=createAdminClient()
        const {error:deleteError}=await admin.from('media_assets').delete().eq('id',id).eq('child_id',childId)
        if(deleteError)throw Error('No se pudo eliminar el vídeo.')
        const path=asset.video_url?.slice('storage:'.length)
        if(asset.video_url?.startsWith('storage:')&&path?.startsWith(`child/${childId}/`)&&!path.includes('..'))await admin.storage.from('videos').remove([path])
        revalidatePath('/portal/videoteca');revalidatePath(`/portal/${childId}`);revalidatePath('/admin/videoteca')
        return {success:true}
    }catch(error){return {error:error instanceof Error?error.message:'No se pudo eliminar el vídeo.'}}
}
