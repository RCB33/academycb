'use server'
import { requireCoachAccess } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { evaluationSchema, madridToday } from '@/lib/player-evaluation'

export async function updateStudentMetrics(childId: string, input: unknown) {
    try {
        const { supabase, user, role } = await requireCoachAccess()
        const parsed = evaluationSchema.safeParse(input)
        if (!z.string().uuid().safeParse(childId).success || !parsed.success) return {success:false,error:'Introduce puntuaciones enteras entre 0 y 99.'}
        const date = parsed.data.recorded_at || madridToday()
        if (date > madridToday() || date < '2020-01-01') return {success:false,error:'La fecha de evaluación no es válida.'}
        const {data:child,error:childError}=await supabase.from('children').select('id').eq('id',childId).is('archived_at',null).maybeSingle()
        if(childError || !child)return {success:false,error:'No tienes acceso a este jugador.'}
        const {data:existing,error:readError}=await supabase.from('child_metrics').select('discipline,visible_to_guardian,notes').eq('child_id',childId).eq('recorded_at',date).maybeSingle()
        if(readError)return {success:false,error:'No se pudo consultar la evaluación.'}
        const {error}=await supabase.from('child_metrics').upsert({
            ...parsed.data,child_id:childId,recorded_at:date,evaluated_by:user.id,
            discipline:parsed.data.discipline ?? existing?.discipline ?? 50,
            notes:parsed.data.notes ?? existing?.notes ?? null,
            visible_to_guardian:parsed.data.visible_to_guardian ?? existing?.visible_to_guardian ?? (role==='admin'),
        },{onConflict:'child_id,recorded_at'})
        if(error)return {success:false,error:'No se pudo guardar la evaluación. Comprueba que el jugador está activo y tu acceso sigue habilitado.'}
        revalidatePath(`/admin/crm/alumnos/${childId}`);revalidatePath(`/coach/jugadores/${childId}`);revalidatePath(`/portal/${childId}`)
        return {success:true}
    }catch{return {success:false,error:'No tienes permisos para guardar esta evaluación.'}}
}
