'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MediaAsset = {
    id: string
    category_id: string | null
    team_id: string | null
    child_id: string | null
    context: string
    title: string
    description: string | null
    video_url: string
    thumbnail_url: string | null
    created_at: string
    categories?: { name: string }
    teams?: { name: string }
    children?: { full_name: string }
}

export async function createMediaAsset(data: {
    title: string
    description?: string
    video_url: string
    category_id: string
    team_id?: string | null
    child_id?: string | null
    context?: string
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
            team_id: data.team_id || null,
            child_id: data.child_id || null,
            context: data.context || 'academia',
            thumbnail_url: thumbnail_url
        }])

    if (error) {
        console.error("Error creating media asset:", error)
        return { success: false, error: "Error al guardar el vídeo" }
    }

    revalidatePath('/admin/videoteca')
    revalidatePath('/portal/videoteca')
    return { success: true }
}

export async function getMediaAssets(categoryId?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('media_assets')
        .select(`
            *,
            categories(name),
            teams(name),
            children(full_name)
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
    revalidatePath('/portal/videoteca')
    return { success: true }
}

export async function getTeamsForCategory(categoryId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('category_id', categoryId)
        .order('name')

    if (error) {
        console.error("Error fetching teams:", error)
        return []
    }
    return data || []
}

export async function getChildrenForTeam(teamId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('team_players')
        .select('child:children(id, full_name)')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching children:", error)
        return []
    }
    return (data || []).map((d: any) => d.child).filter(Boolean)
}
