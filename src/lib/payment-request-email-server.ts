import 'server-only'
import { createAdminClient } from './supabase/admin'
import { familyBilling, type BillingRequest } from './billing-request'
import { paymentRequestEmail } from './payment-request-email'

// Preview and delivery use the same current, server-side recipient and content.
export async function preparePaymentRequestEmail(r: BillingRequest & { recipient_email: string | null }, origin: string) {
    const db = createAdminClient()
    if(familyBilling(r)) {
        const ids=[...new Set(r.billing_request_items.map(i=>i.snapshot.child_id).filter((id):id is string=>!!id))]
        const [children,guardian,links,receipts]=await Promise.all([
            db.from('children').select('id,full_name,archived_at').in('id',ids),
            db.from('guardians').select('full_name,email,user_id').eq('id',r.guardian_id).single(),
            db.from('child_guardians').select('child_id').eq('guardian_id',r.guardian_id).in('child_id',ids),
            db.from('payments').select('id,child_id,amount,status,type,concept_code,due_date,manual_receipt_allocations(id)').in('id',r.billing_request_items.map(i=>i.payment_id)),
        ])
        if(children.error||guardian.error||links.error||receipts.error||!guardian.data?.user_id||guardian.data.email?.trim().toLowerCase()!==r.recipient_email?.trim().toLowerCase()||children.data?.length!==ids.length||children.data.some(c=>c.archived_at)||ids.some(id=>!links.data?.some(l=>l.child_id===id))||receipts.data?.length!==r.billing_request_items.length) throw Error('Revisa el acceso y los vínculos de todos los hermanos.')
        if(r.billing_request_items.some(i=>{const p=receipts.data.find(p=>p.id===i.payment_id);return !p||p.child_id!==i.snapshot.child_id||p.type!=='academy'||!(i.phase==='initial'?['monthly','registration','plus']:['monthly']).includes(p.concept_code)||!['pending','failed'].includes(p.status)||p.manual_receipt_allocations?.length||Math.round(Number(p.amount)*100)!==Number(i.amount_cents)||p.due_date!==i.due_date})) throw Error('Los recibos familiares han cambiado. Revisa antes de enviar.')
        return paymentRequestEmail({request:r,childName:children.data.map(c=>c.full_name).join(' y '),guardianName:guardian.data.full_name,origin})
    }
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
