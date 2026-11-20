'use server'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requirePlayerPhotoAccess } from '@/lib/player-photo-access'
import { preparePlayerPhoto } from '@/lib/player-photo'
import { createAdminClient } from '@/lib/supabase/admin'

export async function savePlayerPhoto(formData: FormData) {
    try {
        const childId = String(formData.get('childId') || '')
        await requirePlayerPhotoAccess(childId)
        const bytes = await preparePlayerPhoto(formData.get('file') as File)
        const admin = createAdminClient()
        const path = `student-avatars/${childId}-${randomUUID()}.webp`
        const { error: uploadError } = await admin.storage.from('profile_images').upload(path, bytes, { contentType: 'image/webp' })
        if (uploadError) return { error: 'No se pudo subir la foto. Inténtalo de nuevo.' }
        // Recheck ownership after the upload. Only this one field is writable.
        try {
            await requirePlayerPhotoAccess(childId)
            const { data: { publicUrl } } = admin.storage.from('profile_images').getPublicUrl(path)
            const { data, error } = await admin.from('children').update({ avatar_url: publicUrl }).eq('id', childId).is('archived_at', null).select('id').single()
            if (error || !data) throw new Error('No se pudo guardar la foto del jugador.')
            revalidatePath('/portal/dashboard')
            revalidatePath(`/portal/${childId}`)
            revalidatePath(`/admin/crm/alumnos/${childId}`)
            return { success: true, url: publicUrl }
        } catch (error) {
            await admin.storage.from('profile_images').remove([path])
            throw error
        }
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'No se pudo guardar la foto.' }
    }
}
