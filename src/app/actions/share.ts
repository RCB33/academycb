'use server'

import { requireUser } from '@/lib/auth'

type RotateShareResult = { success: true; token: string } | { success: false; error: string }

export async function rotatePublicShareToken(childId: string): Promise<RotateShareResult> {
    const { supabase } = await requireUser()
    if (!/^[0-9a-f-]{36}$/i.test(childId)) return { success: false, error: 'Jugador no válido.' }

    const { data, error } = await supabase.rpc('rotate_public_share_token', { child_uuid: childId })
    if (error || !data) return { success: false, error: 'No se pudo renovar el enlace.' }
    return { success: true, token: data as string }
}
