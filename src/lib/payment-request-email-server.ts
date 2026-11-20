import 'server-only'
import { createAdminClient } from './supabase/admin'
import { type BillingRequest } from './billing-request'
import { paymentRequestEmail } from './payment-request-email'

// Preview and delivery use the same current, server-side recipient and content.
export async function preparePaymentRequestEmail(r: BillingRequest & { recipient_email: string | null }, origin: string) {
    const db = createAdminClient()
    const [child, guardian, link, receipts] = await Promise.all([
        db.from('children').select('full_name,archived_at').eq('id',r.child_id).single(),
        db.from('guardians').select('full_name,email,user_id').eq('id',r.guardian_id).single(),
        db.from('child_guardians').select('guardian_id').eq('child_id',r.child_id).eq('guardian_id',r.guardian_id).maybeSingle(),
        db.from('payments').select('id,amount,status,type,concept_code,due_date,manual_receipt_allocations(id)').eq('child_id',r.child_id).in('id',r.billing_request_items.map(i=>i.payment_id)),
    ])
    if (child.error || guardian.error || link.error || !child.data || child.data.archived_at || !guardian.data?.user_id || !link.data || guardian.data.email?.trim().toLowerCase() !== r.recipient_email?.trim().toLowerCase()) throw new Error('Revisa el jugador y la cuenta del tutor antes de enviar el enlace.')
    if (receipts.error || receipts.data?.length !== r.billing_request_items.length || r.billing_request_items.some(i=>{
        const p=receipts.data.find(p=>p.id===i.payment_id)
        return !p || p.type!=='academy' || !(i.phase==='initial'?['monthly','registration','plus']:['monthly']).includes(p.concept_code) || !['pending','failed'].includes(p.status) || p.manual_receipt_allocations?.length || Math.round(Number(p.amount)*100)!==Number(i.amount_cents) || p.due_date!==i.due_date
    })) throw new Error('Las cuotas han cambiado. Revisa los recibos antes de enviar el enlace.')
    return paymentRequestEmail({ request:r, childName:child.data.full_name, guardianName:guardian.data.full_name, origin })
}
