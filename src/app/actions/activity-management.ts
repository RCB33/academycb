'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function acceptCampusRequest(id: string, assignment?: {campusId:string;amount:number}) {
  const { supabase } = await requireAdmin()
  if (!z.string().uuid().safeParse(id).success) return { error: 'Solicitud no válida.' }
  const parsedAssignment=z.object({campusId:z.string().uuid(),amount:z.number().finite().min(0).max(10000)}).optional().safeParse(assignment)
  if(!parsedAssignment.success)return {error:'Selecciona una edición y revisa el importe.'}
  const { data, error } = assignment
    ? await supabase.rpc('assign_and_accept_campus_request',{request_uuid:id,selected_campus:assignment.campusId,validated_amount:assignment.amount})
    : await supabase.rpc('accept_campus_request', { request_uuid: id })
  if (error) return { error: error.message }
  for (const path of ['/admin/campus', '/admin/campus/solicitudes', '/admin/actividades', '/admin/leads', '/admin/crm/alumnos', '/admin/finanzas']) revalidatePath(path)
  return { success: true, enrollmentId: data as string }
}

export async function saveTournamentOperations(form: FormData) {
  const { user } = await requireAdmin()
  const schema = z.object({
    id: z.string().uuid(), phone: z.string().trim().regex(/^\+?[0-9\s()-]{9,20}$/, 'Revisa el teléfono.'),
    club: z.string().trim().max(120), coach: z.string().trim().max(120),
    internal_note: z.string().trim().max(3000), kit_status: z.enum(['pending','ordered','ready','delivered','not_needed']),
  })
  const parsed = schema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const teams = Object.fromEntries(['231','champions','costa-brava'].filter(id => form.has(`team_${id}`)).map(id => [id, String(form.get(`team_${id}`) || '').trim()]))
  if (Object.values(teams).some(name => name.length > 100)) return { error: 'El nombre del equipo es demasiado largo.' }
  const { id, ...changes } = parsed.data
  const { error } = await createAdminClient().rpc('save_event_operations', { registration: id, actor: user.id, changes: { ...changes, teams, contacted: form.has('contacted'), documents_checked: form.has('documents_checked') } })
  if (error) return { error: error.message }
  revalidatePath('/admin/torneos/inscripciones'); revalidatePath('/admin/actividades'); revalidatePath('/torneos/inscripcion')
  return { success: true }
}
