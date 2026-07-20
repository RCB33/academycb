'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAcademyStaff } from '@/lib/auth'

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

    const { supabase, user } = await requireAcademyStaff()
    const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .select('id, team_id, category_id')
        .eq('id', parsed.data.eventId)
        .single()

    if (eventError || !event) throw new Error('No tienes acceso a esta sesión')

    let childQuery = supabase.from('children').select('id').eq('id', parsed.data.childId)
    if (event.team_id) childQuery = childQuery.eq('team_id', event.team_id)
    else if (event.category_id) childQuery = childQuery.eq('category_id', event.category_id)
    else throw new Error('La sesión no tiene equipo ni categoría')

    const { data: child } = await childQuery.maybeSingle()
    if (!child) throw new Error('El alumno no pertenece a esta sesión')

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
