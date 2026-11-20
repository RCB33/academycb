'use server'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePlayerPhotoAccess } from '@/lib/player-photo-access'
import { preparePlayerPhoto } from '@/lib/player-photo'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getPlayerGallery(childId: string) {
    const { supabase, role, user } = await requirePlayerPhotoAccess(childId)
    const { data, error } = await supabase.from('media_assets').select('id,url,title,created_by').eq('child_id', childId).eq('media_type', 'image').order('created_at', { ascending: false })
    if (error) throw new Error('No se pudo cargar la galería.')
    return (data || []).filter(image => image.url).map(image => ({
        id: image.id, title: image.title, url: `/api/player-gallery/${image.id}`,
        canDelete: role === 'admin' || image.created_by === user.id,
    }))
}

export async function uploadImage(formData: FormData) {
    try {
        const childId = String(formData.get('childId') || '')
        const { user } = await requirePlayerPhotoAccess(childId)
        const file = formData.get('file') as File
        const bytes = await preparePlayerPhoto(file)
        const admin = createAdminClient(), path = `${childId}/${randomUUID()}.webp`
        const { error } = await admin.storage.from('gallery').upload(path, bytes, { contentType: 'image/webp' })
        if (error) throw new Error('No se pudo subir la foto.')
        try {
            await requirePlayerPhotoAccess(childId)
            const { error: dbError } = await admin.from('media_assets').insert({ child_id: childId, title: file.name.slice(0,150), url: path, media_type: 'image', context: 'academia', created_by: user.id })
            if (dbError) throw new Error('No se pudo guardar la foto.')
        } catch (error) { await admin.storage.from('gallery').remove([path]); throw error }
        revalidatePath('/portal/videoteca'); revalidatePath(`/portal/${childId}`); revalidatePath(`/admin/crm/alumnos/${childId}`)
        return { success: true }
    } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo subir la foto.' } }
}

export async function deleteImage(id: string, childId: string) {
    try {
        const { supabase, role, user } = await requirePlayerPhotoAccess(childId)
        if (!z.string().uuid().safeParse(id).success) throw new Error('Foto no válida.')
        const { data: media, error } = await supabase.from('media_assets').select('id,url,created_by').eq('id', id).eq('child_id', childId).eq('media_type', 'image').maybeSingle()
        if (error || !media || (role !== 'admin' && media.created_by !== user.id)) throw new Error('No puedes eliminar esta foto.')
        const admin = createAdminClient()
        const { error: deleteError } = await admin.from('media_assets').delete().eq('id', id).eq('child_id', childId)
        if (deleteError) throw new Error('No se pudo eliminar la foto.')
        // Only remove objects in this player's folder, never arbitrary external URLs.
        const path = media.url?.startsWith('http') ? media.url.split('/gallery/')[1]?.split('?')[0] : media.url
        if (path?.startsWith(`${childId}/`) && !path.includes('..')) await admin.storage.from('gallery').remove([path])
        revalidatePath('/portal/videoteca'); revalidatePath(`/portal/${childId}`); revalidatePath(`/admin/crm/alumnos/${childId}`)
        return { success: true }
    } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo eliminar la foto.' } }
}
