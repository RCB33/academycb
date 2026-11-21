'use server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import type { WallComment, WallEngagement } from '@/lib/community-social'

async function engagement(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], postId: string): Promise<WallEngagement> {
    const { data, error } = await supabase.rpc('community_post_engagement', { post_ids: [postId] })
    if (error || !data?.[0]) throw Error('La publicación ya no está disponible.')
    return { likes: Number(data[0].likes), liked: data[0].liked, comments: Number(data[0].comments) }
}
export async function setCommunityLike(postId: string, liked: boolean) {
    try {
        if (!z.string().uuid().safeParse(postId).success || typeof liked !== 'boolean') throw Error('Publicación no válida.')
        const { supabase, user } = await requireUser()
        const result = liked
            ? await supabase.from('community_post_likes').upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
            : await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
        if (result.error) throw Error('No se pudo actualizar tu me gusta.')
        return { success: true as const, engagement: await engagement(supabase, postId) }
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : 'No se pudo actualizar.' } }
}
export async function getCommunityComments(postId: string, offset = 0) {
    try {
        if (!z.string().uuid().safeParse(postId).success || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000) throw Error('Publicación no válida.')
        const { supabase, user } = await requireUser()
        const summary = await engagement(supabase, postId)
        const { data, error } = await supabase.from('community_post_comments').select('id,body,author_name,author_user_id,created_at').eq('post_id', postId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 19)
        if (error) throw Error('No se pudieron cargar los comentarios.')
        return { success: true as const, engagement: summary, comments: (data || []).map(c => ({ id: c.id, body: c.body, author_name: c.author_name, created_at: c.created_at, isOwn: c.author_user_id === user.id })) as WallComment[], hasMore: offset + (data?.length || 0) < summary.comments }
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : 'No se pudo cargar.' } }
}
export async function addCommunityComment(postId: string, id: string, body: string) {
    try {
        const parsed = z.object({ postId: z.string().uuid(), id: z.string().uuid(), body: z.string().trim().min(1).max(600) }).safeParse({ postId, id, body })
        if (!parsed.success) throw Error('Escribe un comentario de 1 a 600 caracteres.')
        const { supabase, user } = await requireUser()
        const { error } = await supabase.from('community_post_comments').insert({ id, post_id: postId, author_user_id: user.id, body: parsed.data.body })
        if (error) {
            if (error.code !== '23505') throw Error('No se pudo publicar tu comentario.')
            const { data } = await supabase.from('community_post_comments').select('id').eq('id', id).eq('post_id', postId).eq('author_user_id', user.id).eq('body', parsed.data.body).maybeSingle()
            if (!data) throw Error('No se pudo comprobar el comentario. Recarga la publicación.')
        }
        return { success: true as const }
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : 'No se pudo publicar.' } }
}
export async function deleteCommunityComment(id: string) {
    try {
        if (!z.string().uuid().safeParse(id).success) throw Error('Comentario no válido.')
        const { supabase } = await requireUser()
        // RLS permits only the author or an active administrator.
        const { data, error } = await supabase.from('community_post_comments').delete().eq('id', id).select('id')
        if (error || !data?.length) throw Error('No puedes eliminar este comentario o ya no existe.')
        return { success: true as const }
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : 'No se pudo eliminar.' } }
}
