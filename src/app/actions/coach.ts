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
        }, { onConflict: 'event_id,child_id,session_date' })

    if (error) {
        console.error('Error saving attendance:', error)
        throw new Error('No se pudo guardar la asistencia')
    }

    revalidatePath(`/coach/session/${parsed.data.eventId}`)
    return { success: true }
}

export async function setSessionPlayer(eventId:string,childId:string,included:boolean){
    try {
        const input=z.object({eventId:z.string().uuid(),childId:z.string().uuid(),included:z.boolean()}).parse({eventId,childId,included})
        const {supabase,user}=await requireCoachAccess()
        const {error}=await supabase.from('coach_session_roster').upsert({event_id:input.eventId,child_id:input.childId,included:input.included,updated_by:user.id},{onConflict:'event_id,child_id'})
        if(error)return {success:false,error:error.message.includes('asistencia registrada')?'No se puede quitar: ya tiene asistencia registrada. Conservamos su historial.':'No se pudo cambiar la lista de esta sesión.'}
        revalidatePath(`/coach/session/${eventId}`);revalidatePath('/coach');revalidatePath('/coach/calendario')
        return {success:true}
    }catch{return {success:false,error:'No tienes acceso o los datos no son válidos.'}}
}

export async function saveCoachObservation(childId:string,body:string){
    try{
        const input=z.object({childId:z.string().uuid(),body:z.string().trim().min(2).max(2000)}).parse({childId,body})
        const {supabase,user}=await requireCoachAccess()
        const {error}=await supabase.from('coach_observations').insert({child_id:input.childId,author_id:user.id,body:input.body})
        if(error)return {success:false,error:'No se pudo guardar la revisión.'}
        revalidatePath(`/coach/jugadores/${childId}`)
        return {success:true}
    }catch{return {success:false,error:'Escribe una revisión de entre 2 y 2000 caracteres.'}}
}
