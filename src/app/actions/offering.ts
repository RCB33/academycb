'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { groupSchema,planSchema,campusOfferSchema,tournamentProgramSchema } from '@/lib/offering'

export async function saveOffering(kind:string,id:string|null,version:string|null,input:unknown) {
  try {
    const {supabase}=await requireAdmin()
    if(id&&kind!=='tournaments') z.string().uuid().parse(id)
    let table:string,values:Record<string,unknown>
    if(kind==='group') {table='teams';values=groupSchema.parse(input)}
    else if(kind==='plan') {
      table='membership_plans';const p=planSchema.parse(input)
      const months=(Number(p.season_end.slice(0,4))-Number(p.season_start.slice(0,4)))*12+Number(p.season_end.slice(5,7))-Number(p.season_start.slice(5,7))+1
      if(months<1||months>12) throw new Error('La temporada debe durar entre uno y doce meses.')
      values={...p,duration_months:months,frequency:'mensual'}
    } else if(kind==='campus') {
      table='campuses';const c=campusOfferSchema.parse(input)
      values={...c,price:Math.min(...c.public_program.weeks.map(w=>w.price)),year:Number(c.start_date.slice(0,4))}
      if(!id) values={...values,capacity_unlimited:true,capacity:0}
    } else if(kind==='tournaments') {
      table='event_campaign_settings';if(id!=='christmas-2026') throw new Error('Campaña no válida.')
      values={public_program:tournamentProgramSchema.parse(input)}
    } else throw new Error('Apartado no válido.')
    if(id&&!version) throw new Error('Recarga la página antes de guardar.')
    const db=kind==='tournaments'?createAdminClient():supabase
    const result=id?await db.from(table).update(values).eq('id',id).eq('updated_at',version!).select('id').maybeSingle():await db.from(table).insert(values).select('id').single()
    if(result.error) throw new Error('No se pudo guardar. Revisa los campos y vuelve a intentarlo.')
    if(!result.data) throw new Error('Otra persona ha modificado estos datos. Recarga para revisar la última versión.')
    for(const path of ['/admin/gestion','/admin/academia','/admin/campus','/admin/torneos','/academia','/campus','/campus/inscripcion','/torneos','/torneos/inscripcion','/inscripcion']) revalidatePath(path,'layout')
    return {success:true}
  } catch(error) {return {error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error?error.message:'No se pudo guardar.'}}
}
