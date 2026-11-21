'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'

export async function setContactArchived(id: string, archived: boolean) {
    const { supabase } = await requireAdmin()
    const input = z.object({ id: z.string().uuid(), archived: z.boolean() }).safeParse({ id, archived })
    if (!input.success) return { success: false as const, error: 'Consulta o acción no válida.' }

    // Closed messages remain available in the archived inbox. No linked records
    // or enrollment/payment tables are modified by this action.
    const status = input.data.archived ? 'closed' : 'new'
    const { data, error } = await supabase.from('contact_messages')
        .update({ status }).eq('id', input.data.id).select('id,status').maybeSingle()

    if (error) return { success: false as const, error: 'No se pudo actualizar la consulta. Inténtalo de nuevo.' }
    if (!data) return { success: false as const, error: 'No se encontró la consulta o ya no está disponible.' }

    revalidatePath('/admin/leads')
    revalidatePath('/admin/solicitudes')
    return { success: true as const, id: data.id as string, status: data.status as 'closed' | 'new' }
}
