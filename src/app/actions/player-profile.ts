'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { playerProfileSchema } from '@/lib/player-profile'
import { madridToday } from '@/lib/player-evaluation'

export async function updatePlayerProfile(childId:string,input:unknown) {
    try {
        const {supabase}=await requireRole(['guardian','admin'])
        const parsed=playerProfileSchema.safeParse(input)
        if(!z.string().uuid().safeParse(childId).success || !parsed.success)return {success:false,error:'Revisa la fecha, el club, la categoría y la división.'}
        const values=parsed.data
        if(values.birth_date && (values.birth_date<'1900-01-01' || values.birth_date>madridToday()))return {success:false,error:'La fecha de nacimiento no es válida.'}
        const {data:child,error}=await supabase.from('children').select('id,birth_date,birth_year').eq('id',childId).is('archived_at',null).maybeSingle()
        if(error || !child)return {success:false,error:'No tienes acceso a este jugador.'}
        if(child.birth_date && !values.birth_date)return {success:false,error:'Completa la fecha de nacimiento antes de guardar.'}
        // Only family profile fields, never Academy category_id, team_id, ratings or payments.
        const update={
            club_name:values.club_name || null,club_category:values.club_category || null,club_division:values.club_division || null,
            ...(values.birth_date ? {birth_date:values.birth_date,birth_year:Number(values.birth_date.slice(0,4))} : {}),
        }
        const {data:saved,error:writeError}=await createAdminClient().from('children').update(update).eq('id',childId).is('archived_at',null).select('id').single()
        if(writeError || !saved)return {success:false,error:'No se pudo guardar el perfil. Inténtalo de nuevo.'}
        revalidatePath('/portal/dashboard');revalidatePath(`/portal/${childId}`);revalidatePath('/portal/profile')
        revalidatePath(`/admin/crm/alumnos/${childId}`);revalidatePath(`/coach/jugadores/${childId}`)
        return {success:true}
    }catch{return {success:false,error:'No se pudo guardar el perfil o no tienes permiso.'}}
}
