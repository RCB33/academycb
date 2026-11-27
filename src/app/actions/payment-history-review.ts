'use server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function completePaymentHistoryReview(input: { membershipId: string; note: string }) {
  const parsed = z.object({ membershipId: z.string().uuid(), note: z.string().trim().min(5).max(2000) }).safeParse(input)
  if (!parsed.success) return { error: 'Describe los meses revisados, los pagos registrados y el saldo pendiente.' }
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.rpc('complete_membership_history_review', { membership_input: parsed.data.membershipId, note_input: parsed.data.note })
    if (error) return { error: error.message }
    revalidatePath('/admin/crm/alumnos', 'layout')
    revalidatePath('/admin/finanzas', 'layout')
    revalidatePath('/portal', 'layout')
    return { success: true }
  } catch { return { error: 'No se pudo guardar la revisión. Comprueba tu sesión y vuelve a intentarlo.' } }
}
