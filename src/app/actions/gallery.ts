'use server'

import { revalidatePath } from 'next/cache'
import { requireAcademyStaff } from '@/lib/auth'
import { randomUUID } from 'node:crypto'

export async function uploadImage(formData: FormData) {
    const { supabase, user } = await requireAcademyStaff()

    const file = formData.get('file') as File
    const childId = formData.get('childId') as string
    if (!file || !childId) {
        return { error: 'No file or child ID provided' }
    }

    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const fileExt = extensions[file.type]
    if (!fileExt || file.size > 8 * 1024 * 1024) {
        return { error: 'Solo se admiten JPG, PNG o WebP de hasta 8 MB.' }
    }

    // 1. Upload to Storage
    const fileName = `${childId}/${randomUUID()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file)

    if (uploadError) {
        console.error('Upload Error:', uploadError)
        return { error: 'Failed to upload image' }
    }

    // Store the private object path. Signed URLs are generated only for
    // authenticated guardians and staff when rendering the page.
    const { error: dbError } = await supabase
        .from('media_assets')
        .insert({
            child_id: childId,
            title: file.name,
            url: fileName,
            media_type: 'image',
            context: 'academia',
            created_by: user.id
        })

    if (dbError) {
        await supabase.storage.from('gallery').remove([fileName])
        console.error('DB Error:', dbError)
        return { error: 'Failed to save image metadata' }
    }

    revalidatePath(`/portal/${childId}`)
    return { success: true }
}

export async function deleteImage(id: string, childId: string) {
    const { supabase } = await requireAcademyStaff()

    // Get the file path first? No, we just delete the record and let storage be?
    // Ideally delete from storage too.
    // Fetch URL to get path.
    const { data: media } = await supabase
        .from('media_assets')
        .select('url')
        .eq('id', id)
        .eq('child_id', childId)
        .single()

    if (media) {
        const path = media.url?.startsWith('http') ? media.url.split('/gallery/')[1] : media.url
        if (path) {
            await supabase.storage.from('gallery').remove([path])
        }
    }

    const { error } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', id)
        .eq('child_id', childId)

    if (error) {
        return { error: 'Failed to delete image' }
    }

    revalidatePath(`/portal/${childId}`)
    return { success: true }
}
