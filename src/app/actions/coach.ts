'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireCoachAccess } from '@/lib/auth'

const AttendanceSchema = z.object({
    eventId: z.string().uuid(),
    childId: z.string().uuid(),
    attendance: z.enum(['present', 'absent', 'excused']),
    sessionDate: z.string().date(),
})

export async function markAttendance(
    eventId: string,
    childId: string,
    attendance: 'present' | 'absent' | 'excused',
    sessionDate: string,
) {
    const parsed = AttendanceSchema.safeParse({ eventId, childId, attendance, sessionDate })
    if (!parsed.success) throw new Error('Datos de asistencia no válidos')

    const { supabase, user } = await requireCoachAccess()
    const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .select('id, team_id, category_id')
        .eq('id', parsed.data.eventId)
        .single()

    if (eventError || !event) throw new Error('No tienes acceso a esta sesión')

    const {data:roster,error:rosterError}=await supabase.rpc('get_session_players',{event_uuid:event.id})
    if(rosterError||!roster?.some((child:{id:string})=>child.id===parsed.data.childId)) throw new Error('El alumno no pertenece a esta sesión')

    const { error } = await supabase
        .from('training_sessions')
        .upsert({
            event_id: parsed.data.eventId,
            child_id: parsed.data.childId,
            session_date: parsed.data.sessionDate,
            attendance: parsed.data.attendance,
            created_by: user.id,
        }, { onConflict: 'event_id,child_id' })

    if (error) {
        console.error('Error saving attendance:', error)
        throw new Error('No se pudo guardar la asistencia')
    }

    revalidatePath(`/coach/session/${parsed.data.eventId}`)
    return { success: true }
}
