export type BillingItem = { payment_id: string; position: number; amount_cents: number; due_date: string; snapshot: {type?:string; description?: string; covered_month?: string } }
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
export function billingSummary(r: BillingRequest) {
 const items=[...r.billing_request_items].sort((a,b)=>a.position-b.position)
 return r.kind==='payment' ? `Pago único de ${euros(r.total_cents)}.` :
  `${items.length} mensualidades de ${euros(items[0]?.amount_cents || 0)}, desde ${items[0]?.due_date} hasta ${items.at(-1)?.due_date}. Total ${euros(r.total_cents)}. Sin renovación automática. La autorización de tarjeta no es un pago.`
}
export function billingReturnPath(value: string | null) {
 return value && /^\/portal\/pagos\/solicitud\/[0-9a-f-]{36}$/i.test(value) ? value : null
}
