'use server'

import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const assignment = z.object({
    requestId: z.string().uuid(), childId: z.string().uuid(), planId: z.string().uuid(),
    planVersion: z.string().datetime({ offset: true }),
    startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    dueDay: z.number().int().min(1).max(28),
    discount: z.number().finite().min(0).max(1_000_000),
    promotion: z.string().trim().max(200),
    enrollment: z.boolean(), plus: z.number().finite().min(0).max(1_000_000),
    teamId: z.string().uuid().nullable(),
})

export async function assignFamilyPlan(input: z.input<typeof assignment>) {
    try {
        const { supabase } = await requireAdmin()
        const data = assignment.parse(input)
        const { error } = await supabase.rpc('assign_family_plan', {
            p_request_id: data.requestId, p_child_id: data.childId, p_plan_id: data.planId,
            p_plan_version: data.planVersion, p_start: `${data.startMonth}-01`,
            p_due_day: data.dueDay, p_discount: data.discount, p_promotion: data.promotion,
            p_enrollment: data.enrollment, p_plus: data.plus, p_team_id: data.teamId,
        })
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin/crm/tutores', 'layout')
        revalidatePath('/admin/crm/alumnos', 'layout')
        revalidatePath('/admin/academia')
        revalidatePath('/admin/finanzas')
        revalidatePath('/portal', 'layout')
        return { success: true }
    } catch {
        return { success: false, error: 'No se pudo guardar la asignación. Revisa los datos y tus permisos.' }
    }
}
