'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MediaAsset = {
    id: string
    category_id: string | null
    title: string
    description: string | null
    video_url: string
    thumbnail_url: string | null
    created_at: string
    categories?: { name: string }
}

export async function createMediaAsset(data: {
    title: string
    description?: string
    video_url: string
    category_id: string
}) {
    const supabase = await createClient()

    // Basic YouTube ID extraction for thumbnail
    let thumbnail_url = null
    const ytMatch = data.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    if (ytMatch && ytMatch[1]) {
        thumbnail_url = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`
    }

    const { error } = await supabase
        .from('media_assets')
        .insert([{
            title: data.title,
            description: data.description || null,
            video_url: data.video_url,
            category_id: data.category_id,
            thumbnail_url: thumbnail_url
        }])

    if (error) {
        console.error("Error creating media asset:", error)
        return { success: false, error: "Error al guardar el vídeo" }
    }

    revalidatePath('/admin/videoteca')
    return { success: true }
}

export async function getMediaAssets(categoryId?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('media_assets')
        .select(`
            *,
            categories(name)
        `)
        .order('created_at', { ascending: false })

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching media assets:", error)
        return []
    }

    return data as MediaAsset[]
}

export async function deleteMediaAsset(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', id)

    if (error) {
        console.error("Error deleting media asset:", error)
        return { success: false, error: "Error al eliminar el vídeo" }
    }

    revalidatePath('/admin/videoteca')
    return { success: true }
}
