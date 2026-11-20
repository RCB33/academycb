import 'server-only'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'

export async function requirePlayerPhotoAccess(childId: string) {
    if (!z.string().uuid().safeParse(childId).success) throw new Error('Jugador no válido.')
    const access = await requireRole(['admin', 'guardian'])
    const { data, error } = await access.supabase.from('children').select('id,avatar_url').eq('id', childId).is('archived_at', null).maybeSingle()
    if (error || !data) throw new Error('No tienes acceso a este jugador.')
    return { ...access, child: data }
}
