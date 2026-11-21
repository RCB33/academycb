'use server'

import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import type { AcademyRequestReviewContext } from '@/lib/academy-request-review'

// Read only: refreshing a stale review never accepts a place or sends email.
export async function refreshAcademyRequestReview(id: string) {
  const { supabase } = await requireAdmin()
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { success: false as const, error: 'Solicitud no válida.' }
  const { data, error } = await supabase.rpc('academy_request_review_context', { request_uuid: parsed.data })
  if (error || !data) return { success: false as const, error: error?.message || 'No se pudo actualizar la revisión. Inténtalo de nuevo.' }
  const context = data as AcademyRequestReviewContext
  if (!['new', 'contacted', 'interested'].includes(context.request.status)) {
    return { success: false as const, closed: true, error: 'Esta solicitud ya está tramitada. Consulta su estado antes de realizar otra acción.' }
  }
  return { success: true as const, context }
}
