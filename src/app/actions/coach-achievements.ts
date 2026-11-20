'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireCoachAccess } from '@/lib/auth'
import { madridToday } from '@/lib/player-evaluation'

export async function awardCoachAchievement(childId:string, achievementId:string, note:string) {
    try {
        const {supabase}=await requireCoachAccess()
        const parsed=z.object({childId:z.string().uuid(),achievementId:z.string().uuid(),note:z.string().trim().max(1000)}).safeParse({childId,achievementId,note})
        if(!parsed.success)return {success:false,error:'Selecciona un trofeo válido y escribe un máximo de 1000 caracteres.'}
        const {data:child,error:childError}=await supabase.from('children').select('id').eq('id',childId).is('archived_at',null).maybeSingle()
        if(childError||!child)return {success:false,error:'No tienes acceso a este jugador.'}
        const {error}=await supabase.from('child_achievements').insert({child_id:childId,achievement_id:achievementId,note:parsed.data.note||null,earned_at:madridToday()})
        if(error)return {success:false,error:error.code==='23505'?'Este jugador ya tiene ese trofeo.':'No se pudo conceder el trofeo. Comprueba tu acceso e inténtalo de nuevo.'}
        revalidatePath(`/coach/jugadores/${childId}`);revalidatePath(`/portal/${childId}`);revalidatePath(`/admin/crm/alumnos/${childId}`)
        return {success:true}
    }catch{return {success:false,error:'No tienes permisos para conceder trofeos.'}}
}
