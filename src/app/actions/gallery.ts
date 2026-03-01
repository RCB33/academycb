'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadImage(formData: FormData) {
    const supabase = await createClient()

    const file = formData.get('file') as File
    const childId = formData.get('childId') as string
    const category = formData.get('category') as string

    if (!file || !childId) {
        return { error: 'No file or child ID provided' }
    }

    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${childId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file)

    if (uploadError) {
        console.error('Upload Error:', uploadError)
        return { error: 'Failed to upload image' }
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName)

    // 3. Insert into DB
    const { error: dbError } = await supabase
        .from('media')
        .insert({
            child_id: childId,
            url: publicUrl,
            type: 'image',
            category: category || 'general',
            uploader_id: (await supabase.auth.getUser()).data.user?.id
        })

    if (dbError) {
        console.error('DB Error:', dbError)
        return { error: 'Failed to save image metadata' }
    }

    revalidatePath(`/portal/${childId}`)
    return { success: true }
}

export async function deleteImage(id: string, childId: string) {
    const supabase = await createClient()

    // Get the file path first? No, we just delete the record and let storage be?
    // Ideally delete from storage too.
    // Fetch URL to get path.
    const { data: media } = await supabase
        .from('media')
        .select('url')
        .eq('id', id)
        .single()

    if (media) {
        // Extract path from URL
        // URL format: .../storage/v1/object/public/gallery/childId/filename
        const path = media.url.split('/gallery/')[1]
        if (path) {
            await supabase.storage.from('gallery').remove([path])
        }
    }

    const { error } = await supabase
        .from('media')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: 'Failed to delete image' }
    }

    revalidatePath(`/portal/${childId}`)
    return { success: true }
}
