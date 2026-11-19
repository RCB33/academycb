import { requireUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { stripeCheckoutMode } from '@/lib/stripe-availability'
import { billingLabels,billingSummary,euros,type BillingRequest } from '@/lib/billing-request'
import { AcceptBilling } from './accept'
import { ConfirmationRefresh } from '@/app/admin/stripe/confirmation-refresh'
import Link from 'next/link'
export default async function BillingRequestPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound()
 const {supabase}=await requireUser()
 const {data,error}=await supabase.from('billing_requests').select('*,billing_request_items(*),billing_request_attempts(id,state,billing_status)').eq('id',id).single()
 if(error||!data)notFound()
 const r=data as BillingRequest
 const mode=await stripeCheckoutMode()
 const enabled=r.kind==='subscription'&&mode===r.mode&&(mode==='test'||process.env.STRIPE_RECURRING_PAYMENTS_ENABLED==='true')
 // Request-time expiry on this authenticated, dynamic server page.
 // eslint-disable-next-line react-hooks/purity
 const expired=new Date(r.expires_at).getTime()<=Date.now()
 return <main className="mx-auto max-w-2xl space-y-6 rounded-2xl border bg-white p-6"><p className="text-sm text-slate-500">Academy Costa Brava · Solicitud de administración</p><h1 className="text-2xl font-bold">{r.title}</h1>{r.mode==='test'&&<p className="bg-amber-50 p-3">PRUEBA: usa solo tarjetas de prueba, nunca datos bancarios reales.</p>}<p>{billingSummary(r)}</p><p className="font-semibold">Estado: {billingLabels[r.state]||r.state}{expired&&r.state==='ready'?' · Enlace caducado':''}</p>
 <ul className="divide-y">{[...r.billing_request_items].sort((a,b)=>a.position-b.position).map(i=><li key={i.payment_id} className="flex justify-between gap-4 py-3 text-sm"><span>{i.snapshot.description}<span className="block text-slate-500">{i.due_date}</span></span><strong>{euros(i.amount_cents)}</strong></li>)}</ul><p className="text-xl font-bold">Total: {euros(r.total_cents)}</p>
 {['ready','processing'].includes(r.state)&&!expired&&<AcceptBilling id={r.id} totalCents={Number(r.total_cents)} subscription={r.kind==='subscription'} enabled={enabled} />}
 {r.state==='active'&&<p>Tarjeta autorizada. Cada cuota aparecerá pagada únicamente cuando Stripe confirme el cobro. Para modificar o cancelar los cobros futuros, contacta con secretaría.</p>}
 {data.billing_request_attempts?.some((a:{billing_status:string})=>a.billing_status==='attention')&&<p role="alert" className="rounded bg-amber-50 p-3">Hay una cuota que requiere atención. Contacta con Academy; no contrates otra suscripción.</p>}
 <ConfirmationRefresh pending={r.state==='processing'} /><Link className="block underline" href="/portal/pagos">Volver a mis pagos</Link></main>
}
