'use server'
import { requireFinanceAccess } from '@/lib/auth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export async function createManualCharges(input: unknown) {
    const { supabase } = await requireFinanceAccess()
    const money = z.number().finite().min(0).max(1000000).refine(n => Math.abs(n*100-Math.round(n*100))<0.00001)
    const parsed = z.object({ requestId: z.string().uuid(), childId: z.string().uuid(), lines: z.array(z.object({
        concept: z.enum(['monthly','registration','plus','kit','tournament','campus','other']),
        month: z.string().regex(/^$|^\d{4}-(0[1-9]|1[0-2])$/), gross: money.refine(n=>n>0), discount: money,
        due: z.string().date(), description: z.string().trim().min(2).max(200), promotion: z.string().trim().max(200),
    }).refine(v=>v.discount<=v.gross && (v.discount===0 || v.promotion.length>=3) && (v.concept==='monthly' ? Boolean(v.month) : !v.month))).min(1).max(24) }).safeParse(input)
    if (!parsed.success) return { success: false, error: 'Revisa concepto, meses, importes, vencimiento y motivo del descuento.' }
    const p=parsed.data
    const { error } = await supabase.rpc('create_manual_charges', { request_id:p.requestId, child_input:p.childId, lines_input:p.lines })
    if(error) return {success:false,error:error.code==='P0001'?error.message:'No se pudieron crear los recibos. Revisa antes de repetir.'}
    revalidatePath('/admin/finanzas'); revalidatePath(`/admin/crm/alumnos/${p.childId}`); revalidatePath('/portal/pagos')
    return {success:true}
}
