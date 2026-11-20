'use server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { requestedPaymentChoices, type PaymentService, type EnrollmentPayment } from '@/lib/enrollment-payment'

export type PlayerPaymentRequest = { id: string; activity: string; status: string; created: string; primaryService: string; choices: Partial<Record<PaymentService, EnrollmentPayment>>; campusEnrollmentId?: string }
// Read only the payment preferences, never the medical information in campus_details.
const fields = 'id,service,activity_name,status,created_at,academy_choice:academy_details->payment_choice,requested_payments:academy_details->requested_payments,campus_choice:campus_details->payment_choice'
export async function getPlayerEnrollmentPayments(childId: string): Promise<PlayerPaymentRequest[]> {
    if (!z.string().uuid().safeParse(childId).success) throw new Error('Jugador no válido.')
    const { supabase } = await requireAdmin()
    const [requests, links] = await Promise.all([
        supabase.from('enrollment_requests').select(fields).or(`linked_child_id.eq.${childId},accepted_child_id.eq.${childId}`).neq('status','lost').order('created_at',{ascending:false}),
        supabase.from('campus_request_links').select(`enrollment_id,request:enrollment_requests(${fields}),enrollment:campus_enrollments!inner(child_id)`).eq('enrollment.child_id',childId),
    ])
    if (requests.error || links.error) throw new Error('No se pudieron consultar las formas de pago solicitadas. Recarga la ficha.')
    type Row = { id: string; service: string; activity_name: string; status: string; created_at: string; academy_choice: unknown; requested_payments: unknown; campus_choice: unknown }
    const byId = new Map<string, PlayerPaymentRequest>()
    const add = (r: Row, campusEnrollmentId?: string) => {
        if (r.status === 'lost') return
        byId.set(r.id, { id:r.id,activity:r.activity_name,status:r.status,created:r.created_at,primaryService:r.service,campusEnrollmentId,choices:requestedPaymentChoices({service:r.service,academy_details:{payment_choice:r.academy_choice,requested_payments:r.requested_payments},campus_details:{payment_choice:r.campus_choice}}) })
    }
    // Supabase's dynamic select parser cannot infer the aliases in this shared projection.
    for (const r of (requests.data || []) as unknown as Row[]) add(r)
    for (const link of (links.data || []) as unknown as { enrollment_id:string;request:Row|Row[]|null }[]) {
        const r = Array.isArray(link.request) ? link.request[0] : link.request
        if (r) add(r,link.enrollment_id)
    }
    return [...byId.values()].sort((a,b)=>b.created.localeCompare(a.created))
}
