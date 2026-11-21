export type BillingItem = { payment_id: string; position: number; amount_cents: number; due_date: string; phase?: 'initial' | 'recurring'; snapshot: {type?:string; description?: string; covered_month?: string; child_id?: string; child_name?: string } }
export type BillingRequest = {
 id: string; child_id: string; guardian_id: string; kind: 'payment' | 'subscription'; mode: 'live' | 'test';
 title: string; state: string; total_cents: number; expires_at: string; created_at: string; email_status: string;
 billing_request_items: BillingItem[];
}
export type BillingAttempt = {
 id: string; request_id: string; owner_id: string; state: string; session_id: string | null; checkout_url: string | null;
 schedule_id: string | null; subscription_id: string | null; price_id: string | null; expires_at: string; billing_status: string;
}
export const billingLabels: Record<string,string> = {ready:'Pendiente de aceptación',processing:'Autorización en curso',active:'Suscripción autorizada',completed:'Cobrado',cancelling:'Cancelación en curso',cancelled:'Cancelado',scheduled:'Programado',attention:'Requiere atención',ended:'Finalizado',pending:'Pendiente',open:'Pendiente de autorización',creating:'Preparando',expired:'Enlace Stripe caducado'}
export const euros = (cents: number) => (Number(cents)/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'})
export function billingParts(r: Pick<BillingRequest, 'billing_request_items'>) {
 const ordered=[...r.billing_request_items].sort((a,b)=>a.position-b.position)
 const initial=ordered.filter(i=>i.phase==='initial'),recurring=ordered.filter(i=>i.phase!=='initial')
 return {initial,recurring,initialCents:initial.reduce((sum,i)=>sum+Number(i.amount_cents),0)}
}
/** Receipts stay per child; the card charge is the sum for each due date. */
export function billingMonthly(r: Pick<BillingRequest, 'billing_request_items'>) {
 const months=new Map<string,number>()
 for(const item of billingParts(r).recurring) months.set(item.due_date,(months.get(item.due_date)||0)+Number(item.amount_cents))
 return [...months].sort(([a],[b])=>a.localeCompare(b)).map(([due_date,amount_cents])=>({due_date,amount_cents}))
}
export function familyBilling(r: Pick<BillingRequest, 'billing_request_items'>) {
 return r.billing_request_items.some(i=>Boolean(i.snapshot?.child_name))
}
export function billingItemLabel(item: BillingItem) {
 return [item.snapshot.child_name,item.snapshot.description].filter(Boolean).join(' · ')
}
export function billingSummary(r: BillingRequest) {
 const {initial,initialCents}=billingParts(r),items=billingMonthly(r)
 if(familyBilling(r)) return `Pago familiar: ${euros(initialCents)} al completar Stripe, con el desglose de cada jugador. ${items.length ? 'Después, un único cobro por mes: '+items.map(m=>`${m.due_date}: ${euros(m.amount_cents)}`).join(' · ')+'.' : 'Sin mensualidades posteriores.'} Matrícula y Plus se incluyen una sola vez cuando corresponden. Sin renovación automática.`
 if(initial.length) return `Primer pago de ${euros(initialCents)} al completar Stripe: primera cuota, matrícula y extras incluidos según el desglose. ${items.length?`Después, ${items.length} mensualidades de ${euros(items[0].amount_cents)}, desde ${items[0].due_date} hasta ${items.at(-1)!.due_date}.`:'No quedan mensualidades posteriores.'} Total de temporada incluido en este enlace: ${euros(r.total_cents)}. Sin renovación automática.`
 return r.kind==='payment' ? `Pago único de ${euros(r.total_cents)}.` :
  `${items.length} mensualidades de ${euros(items[0]?.amount_cents || 0)}, desde ${items[0]?.due_date} hasta ${items.at(-1)?.due_date}. Total ${euros(r.total_cents)}. Sin renovación automática. La autorización de tarjeta no es un pago.`
}
export function billingReturnPath(value: string | null) {
 return value && /^\/portal\/pagos\/solicitud\/[0-9a-f-]{36}$/i.test(value) ? value : null
}
