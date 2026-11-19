'use server'

import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { finishManualAssignment } from '@/lib/enrollment-onboarding'

const assignment = z.object({
    requestId: z.string().uuid(), childId: z.string().uuid(), planId: z.string().uuid(),
    planVersion: z.string().datetime({ offset: true }),
    startDate: z.string().date(),
    dueDay: z.number().int().min(1).max(28),
    discount: z.number().finite().min(0).max(1_000_000),
    promotion: z.string().trim().max(200),
    enrollment: z.boolean(), plus: z.union([z.literal(0), z.literal(50)]),
    teamId: z.string().uuid().nullable(), secondTeamId:z.string().uuid().nullable(),
})

export async function assignFamilyPlan(input: z.input<typeof assignment>) {
    try {
        const { supabase } = await requireAdmin()
        const data = assignment.parse(input)
        // Legacy receipts cannot safely be matched to new monthly obligations.
        // Do not infer a covered month from the payment date or alter Karen's records.
        const { data: legacy, error: legacyError } = await supabase.from('payments')
            .select('id,concept_code').eq('child_id',data.childId).eq('type','academy')
            .is('covered_month',null).in('status',['paid','pending','failed']).gt('amount',0)
        if (legacyError) return { success:false, error:'No se pudo comprobar el historial del alumno. No se ha creado ninguna cuota.' }
        if (legacy?.some(p=>!p.concept_code || p.concept_code==='monthly')) {
            return { success:false, error:'Este alumno tiene pagos antiguos sin concepto o mes cubierto. Karen debe revisar a qué meses corresponden antes de generar el plan. No se ha modificado ningún pago.' }
        }
        const { data:membershipId,error } = await supabase.rpc('assign_family_plan_v2', {
            p_request_id: data.requestId, p_child_id: data.childId, p_plan_id: data.planId,
            p_plan_version: data.planVersion, p_start: data.startDate,
            p_due_day: data.dueDay, p_discount: data.discount, p_promotion: data.promotion,
            p_enrollment: data.enrollment, p_plus: data.plus, p_team_id: data.teamId,p_second_team_id:data.secondTeamId,
        })
        if (error) return { success: false, error: error.message }
        const notice=await finishManualAssignment(membershipId,data.childId).catch(()=>
            'Plaza y cuotas creadas. Falta completar el aviso al tutor; revisa su acceso y Estado de correos. No se ha realizado ningún cobro.')
        revalidatePath('/admin/dashboard')
        revalidatePath('/admin/actividades/correos')
        revalidatePath('/admin/crm/tutores', 'layout')
        revalidatePath('/admin/crm/alumnos', 'layout')
        revalidatePath('/admin/academia')
        revalidatePath('/admin/finanzas')
        revalidatePath('/portal', 'layout')
        return { success: true, notice }
    } catch {
        return { success: false, error: 'No se pudo guardar la asignación. Revisa los datos y tus permisos.' }
    }
}
