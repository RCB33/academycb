'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAcademyOffer } from '@/lib/offering-server'
import { academyCompletionSchema, completeAcademyDetails, type AcademyCompletionContext } from '@/lib/academy-request-completion'

export async function completeAcademyRequest(id: string, input: unknown) {
  const { supabase } = await requireAdmin()
  const parsed = academyCompletionSchema.safeParse(input)
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return { error: 'Completa el plan, los grupos, la fecha y la forma de pago.' }
  const { data, error } = await supabase.rpc('academy_request_completion_context', { request_uuid: id })
  const context = data as AcademyCompletionContext | null
  if (error || !context) return { error: error?.message || 'No se pudo cargar la solicitud.' }
  if (context.revision !== parsed.data.revision) return { error: 'La solicitud ha cambiado. Recarga antes de guardar.' }
  let details
  try { details = completeAcademyDetails(await getAcademyOffer(), parsed.data, context.request.birth_date) }
  catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo comprobar el plan.' } }
  const { error: saveError } = await supabase.rpc('complete_academy_request', {
    request_uuid: id, details_input: details, charge_enrollment_input: parsed.data.chargeEnrollment, revision_input: context.revision,
  })
  if (saveError) return { error: saveError.message }
  revalidatePath('/admin/solicitudes', 'layout')
  revalidatePath('/admin/leads')
  return { success: true }
}
