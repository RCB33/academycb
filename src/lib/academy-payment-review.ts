import 'server-only'
import { requireFinanceAccess } from './auth'
import { adminReadAll } from './admin-read-all'
import { receiptBalance } from './receipt-balance'

export async function getAcademyPaymentReview(monthInput?:string) {
    const {supabase}=await requireFinanceAccess()
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})
    const month=monthInput&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(monthInput)?monthInput:today.slice(0,7)
    const [receipts,members,contracts,requests,notices]=await Promise.all([
        adminReadAll((f,t)=>supabase.from('payments').select('id,child_id,ref_id,amount,status,due_date,covered_month,description,child:children(full_name,archived_at),manual_receipt_allocations(amount,paid_date,method,voided_at)').eq('type','academy').eq('concept_code','monthly').eq('covered_month',month).order('id').range(f,t)),
        adminReadAll((f,t)=>supabase.from('academy_memberships').select('id,child_id,agreed_payment_method,child:children(full_name,archived_at)').order('id').range(f,t)),
        adminReadAll((f,t)=>supabase.from('academy_checkout_contracts').select('id,membership_id,state,billing_status').eq('mode','live').in('state',['creating','open','active']).order('id').range(f,t)),
        adminReadAll((f,t)=>supabase.from('billing_requests').select('id,child_id,state,child:children(full_name,archived_at),billing_request_items(payment_id),billing_request_attempts(id,state,billing_status)').eq('mode','live').in('state',['ready','processing','active','cancelling']).order('id').range(f,t)),
        adminReadAll((f,t)=>supabase.from('payment_reminder_deliveries').select('payment_id,status,created_at').order('created_at',{ascending:false}).order('id').range(f,t)),
    ])
    const one=<T>(v:T|T[]|null):T|null=>(Array.isArray(v)?v[0]:v)||null
    const issues=[...contracts.data.filter(c=>c.billing_status==='attention').map(c=>{const m=members.data.find(m=>m.id===c.membership_id);return {id:c.id,childId:m?.child_id,name:one(m?.child||null)?.full_name,archived:one(m?.child||null)?.archived_at}}),...requests.data.filter(r=>r.billing_request_attempts.some(a=>a.billing_status==='attention'&&!['expired','cancelled','completed'].includes(a.state))).map(r=>({id:r.id,childId:r.child_id,name:one(r.child)?.full_name,archived:one(r.child)?.archived_at}))].filter(i=>i.childId&&i.name&&!i.archived)
    const rows=receipts.data.filter(p=>!one(p.child)?.archived_at&&!['cancelled','refunded'].includes(p.status)).map(p=>{
        const m=members.data.find(m=>m.id===p.ref_id),binding=contracts.data.some(c=>c.membership_id===p.ref_id)||requests.data.some(r=>r.billing_request_items.some(i=>i.payment_id===p.id)&&['processing','active','cancelling'].includes(r.state))
        const method=binding?'stripe':m?.agreed_payment_method||'review'
        const balance=receiptBalance(p),last=notices.data.find(n=>n.payment_id===p.id)
        return {id:p.id,childId:p.child_id,name:one(p.child)?.full_name||'Jugador',month,description:p.description,due:p.due_date,amount:Number(p.amount),remaining:balance.remaining,paid:balance.paid,method,attention:issues.some(i=>i.childId===p.child_id),lastReminder:last?{status:last.status,date:last.created_at}:null}
    })
    return {month,today,rows,issues}
}
export type AcademyPaymentReview=Awaited<ReturnType<typeof getAcademyPaymentReview>>
