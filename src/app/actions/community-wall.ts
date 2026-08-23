'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireUser } from '@/lib/auth'

const postSchema = z.object({
    childId: z.string().uuid(),
    body: z.string().trim().min(2).max(1500),
    visibility: z.enum(['private', 'community']),
})

const allowedFiles: Record<string, { extension: string; mediaType: 'image' | 'video' }> = {
    'image/jpeg': { extension: 'jpg', mediaType: 'image' },
    'image/png': { extension: 'png', mediaType: 'image' },
    'image/webp': { extension: 'webp', mediaType: 'image' },
    'video/mp4': { extension: 'mp4', mediaType: 'video' },
    'video/webm': { extension: 'webm', mediaType: 'video' },
    'video/quicktime': { extension: 'mov', mediaType: 'video' },
}

export async function createCommunityPost(formData: FormData) {
    const { supabase, user } = await requireUser()
    const parsed = postSchema.safeParse({ childId: formData.get('child_id'), body: formData.get('body'), visibility: formData.get('visibility') })
    if (!parsed.success) return { success: false, error: 'Revisa el jugador, el texto y la visibilidad de la publicación.' }

    const { data: link } = await supabase.from('child_guardians').select('child_id, guardians!inner(user_id)').eq('child_id', parsed.data.childId).eq('guardians.user_id', user.id).maybeSingle()
    if (!link) return { success: false, error: 'Solo puedes publicar logros de tus jugadores vinculados.' }

    const file = formData.get('file')
    let mediaPath: string | null = null
    let mediaType: 'image' | 'video' | null = null
    if (file instanceof File && file.size > 0) {
        const fileMeta = allowedFiles[file.type]
        if (!fileMeta || file.size > 20 * 1024 * 1024) return { success: false, error: 'Adjunta una imagen o vídeo válido de hasta 20 MB.' }
        const { data: guardian } = await supabase.from('guardians').select('id').eq('user_id', user.id).maybeSingle()
        const { data: consent } = guardian ? await supabase
            .from('signatures')
            .select('consent_options')
            .eq('guardian_id', guardian.id)
            .eq('child_id', parsed.data.childId)
            .eq('document_type', 'Autorización de imagen y vídeo')
            .order('signed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            : { data: null }
        if (!consent?.consent_options?.portal_internal) {
            return { success: false, error: 'Para adjuntar una foto o vídeo necesitas autorizar primero el uso interno en Portal Familias → Autorizaciones.' }
        }
        mediaPath = `${user.id}/${randomUUID()}.${fileMeta.extension}`
        mediaType = fileMeta.mediaType
        const { error } = await supabase.storage.from('community-wall').upload(mediaPath, file, { contentType: file.type })
        if (error) return { success: false, error: 'No se pudo subir el archivo. Inténtalo de nuevo.' }
    }

    const { error } = await supabase.from('community_posts').insert({
        author_user_id: user.id, child_id: parsed.data.childId, body: parsed.data.body,
        visibility: parsed.data.visibility, status: 'published', published_at: new Date().toISOString(), media_path: mediaPath, media_type: mediaType,
    })
    if (error) {
        if (mediaPath) await supabase.storage.from('community-wall').remove([mediaPath])
        return { success: false, error: 'No se pudo guardar la publicación.' }
    }
    revalidatePath('/portal/muro')
    return { success: true }
}

export async function moderateCommunityPost(id: string, status: 'published' | 'rejected') {
    const { supabase } = await requireAdmin()
    if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Publicación no válida.' }
    const { error } = await supabase.from('community_posts').update({ status, published_at: status === 'published' ? new Date().toISOString() : null }).eq('id', id)
    if (error) return { success: false, error: 'No se pudo actualizar la publicación.' }
    revalidatePath('/portal/muro'); revalidatePath('/admin/muro')
    return { success: true }
}

export async function deleteCommunityPost(id: string) {
    const { supabase } = await requireAdmin()
    if (!z.string().uuid().safeParse(id).success) return { success: false, error: 'Publicación no válida.' }
    const { data: post } = await supabase.from('community_posts').select('media_path').eq('id', id).maybeSingle()
    const { error } = await supabase.from('community_posts').delete().eq('id', id)
    if (error) return { success: false, error: 'No se pudo eliminar la publicación.' }
    if (post?.media_path) await supabase.storage.from('community-wall').remove([post.media_path])
    revalidatePath('/portal/muro'); revalidatePath('/admin/muro')
    return { success: true }
}

export async function createAcademyWallPost(formData: FormData) {
    const { supabase, user } = await requireAdmin()
    const body = z.string().trim().min(2).max(1500).safeParse(formData.get('body'))
    if (!body.success) return { success: false, error: 'Escribe un mensaje entre 2 y 1.500 caracteres.' }
    const { error } = await supabase.from('community_posts').insert({ author_user_id: user.id, body: body.data, visibility: 'community', status: 'published', published_at: new Date().toISOString() })
    if (error) return { success: false, error: 'No se pudo publicar el mensaje Academy.' }
    revalidatePath('/portal/muro'); revalidatePath('/admin/muro')
    return { success: true }
}
