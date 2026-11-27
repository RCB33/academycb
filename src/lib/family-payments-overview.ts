import { receiptBalance, type ReceiptAllocation } from './receipt-balance'
import type { BillingRequest } from './billing-request'
export type FamilyReceipt = {
 id:string; child_id:string|null; ref_id:string|null; type:string; description:string|null; amount:number; status:string;
 due_date:string|null; paid_at:string|null; method:string|null; covered_month:string|null;
 underReview?:boolean; manual_receipt_allocations:ReceiptAllocation[]; downloadable?:boolean; hasInvoice?:boolean;
}
export type FamilyPlan = {id:string;child_id:string;status:string;start_date:string;end_date:string;monthly_price:number|null;agreed_payment_method:string|null;plan_snapshot:{name?:string;frequency?:string}|null;plan:{name:string;frequency:string}|null}
export type FamilyBilling = BillingRequest & {billing_request_attempts?:{state:string;billing_status:string;schedule_id:string|null;subscription_id:string|null}[]}
export type FamilyContract = {membership_id:string;mode:string;state:string;billing_status:string;stripe_schedule_id?:string|null;stripe_subscription_id?:string|null}
export type PaymentChannel='automatic'|'attention'|'processing'|'cancelling'|'card_pending'|'cash'|'transfer'|'unknown'
export function paymentChannel(p:FamilyReceipt,plans:FamilyPlan[],requests:FamilyBilling[],contracts:FamilyContract[],mode:string):PaymentChannel {
 if(p.status==='failed')return 'attention'
 const request=requests.find(r=>r.mode===mode&&r.billing_request_items.some(i=>i.payment_id===p.id))
 if(request){
  const attempts=(request.billing_request_attempts||[]).filter(a=>!['expired','cancelled'].includes(a.state))
  if(attempts.some(a=>a.billing_status==='attention'))return 'attention'
  if(request.state==='cancelling')return 'cancelling'
  if(request.state==='processing')return 'processing'
  if(request.state==='active'&&attempts.some(a=>a.state==='active'&&['active','scheduled'].includes(a.billing_status)&&Boolean(a.schedule_id||a.subscription_id)))return 'automatic'
 }
 const legacy=contracts.find(c=>c.mode===mode&&c.membership_id===p.ref_id&&!['expired','cancelled','completed'].includes(c.state))
 if(legacy){
  if(legacy.billing_status==='attention')return 'attention'
  if(legacy.state==='active'&&['active','scheduled'].includes(legacy.billing_status)&&Boolean(legacy.stripe_schedule_id||legacy.stripe_subscription_id))return 'automatic'
  if(['creating','open'].includes(legacy.state))return 'processing'
 }
 const method=plans.find(m=>m.id===p.ref_id)?.agreed_payment_method||p.method
 if(method==='cash'||method==='efectivo')return 'cash'
 if(method==='transfer'||method==='transferencia')return 'transfer'
 if(method==='stripe'||method==='tarjeta'||request)return 'card_pending'
 return 'unknown'
}
export function familyPaymentsOverview(receipts:FamilyReceipt[],today:string,childId='') {
 const visible=receipts.filter(p=>!childId||p.child_id===childId)
 const review=visible.filter(p=>p.underReview&&receiptBalance(p).remaining>0&&!['cancelled','refunded'].includes(p.status))
 const open=visible.filter(p=>!p.underReview&&receiptBalance(p).remaining>0&&!['cancelled','refunded'].includes(p.status))
 const due=open.filter(p=>p.due_date&&p.due_date<=today).sort((a,b)=>a.due_date!.localeCompare(b.due_date!))
 const future=open.filter(p=>p.due_date&&p.due_date>today).sort((a,b)=>a.due_date!.localeCompare(b.due_date!))
 const undated=open.filter(p=>!p.due_date)
 const nextDate=future[0]?.due_date||null
 const next=future.filter(p=>p.due_date===nextDate)
 const history=visible.filter(p=>!['cancelled','refunded'].includes(p.status)).flatMap(p=>{
  if(p.manual_receipt_allocations.length)return p.manual_receipt_allocations.filter(a=>!a.voided_at&&Number(a.amount)>0).map((a,index)=>({key:p.id+'-'+index,receipt:p,amount:Number(a.amount),date:a.paid_date||null,method:a.method}))
  return p.status==='paid'&&Number(p.amount)>0?[{key:p.id,receipt:p,amount:Number(p.amount),date:p.paid_at?.slice(0,10)||null,method:p.method}]:[]
 }).sort((a,b)=>(b.date||'').localeCompare(a.date||''))
 const archived=visible.filter(p=>['cancelled','refunded'].includes(p.status)||Number(p.amount)===0)
 const sum=(items:FamilyReceipt[])=>items.reduce((n,p)=>n+Math.round(receiptBalance(p).remaining*100),0)/100
 return {visible,review,open,due,future,undated,next,nextDate,history,archived,dueTotal:sum(due),nextTotal:sum(next)}
}
