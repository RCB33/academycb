import { z } from 'zod'
import { requireFinanceAccess } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe } from '@/lib/stripe-payments'
import { stripeCheckoutMode } from '@/lib/stripe-availability'
import { stripePaymentOrigin } from '@/lib/stripe-return-origin'
import { type BillingRequest, type BillingAttempt } from '@/lib/billing-request'
import { preparePaymentRequestEmail } from '@/lib/payment-request-email-server'

export const dynamic='force-dynamic'
export const maxDuration=60
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
const uuid=z.string().uuid()
const create=z.object({action:z.literal('create'),id:uuid,childId:uuid,guardianId:uuid,kind:z.enum(['payment','subscription']),title:z.string().trim().min(2).max(150),paymentIds:z.array(uuid).min(1).max(24)})
const command=z.discriminatedUnion('action',[create,z.object({action:z.literal('email'),id:uuid}),z.object({action:z.literal('cancel'),id:uuid})])
export async function GET(request:Request) {
 try {await requireFinanceAccess()}catch{return reply({error:'Sin permisos'},403)}
 const db=createAdminClient(), childId=new URL(request.url).searchParams.get('child_id')
 if(childId&&!uuid.safeParse(childId).success)return reply({error:'Jugador no válido'},400)
 const children=await db.from('children').select('id,full_name').order('full_name').limit(1000)
 let q=db.from('billing_requests').select('*,billing_request_items(*),billing_request_attempts(id,state,billing_status,subscription_id,accepted_at,billing_request_collections(payment_id,amount_cents))').order('created_at',{ascending:false}).limit(100)
 if(childId)q=q.eq('child_id',childId)
 const requests=await q
 const [receipts,guardians]=childId?await Promise.all([
  db.from('payments').select('id,description,amount,status,due_date,covered_month,concept_code,manual_receipt_allocations(id)').eq('child_id',childId).eq('type','academy').eq('concept_code','monthly').gt('due_date',new Date().toISOString().slice(0,10)).in('status',['pending','failed']).order('due_date'),
  db.from('child_guardians').select('guardian:guardians(id,full_name,email,phone,user_id)').eq('child_id',childId),
 ]):[{data:[],error:null},{data:[],error:null}]
 if(children.error||requests.error||receipts.error||guardians.error)return reply({error:'No se pudieron cargar los cobros'},500)
 const mode=await stripeCheckoutMode()
 return reply({children:children.data,requests:requests.data,receipts:(receipts.data||[]).filter(p=>!p.manual_receipt_allocations?.length && p.due_date?.endsWith('-01')),guardians:guardians.data?.map(g=>g.guardian),cardEnabled:Boolean(mode),recurringEnabled:mode==='test'||(Boolean(mode)&&process.env.STRIPE_RECURRING_PAYMENTS_ENABLED==='true'),emailConfigured:Boolean(process.env.RESEND_API_KEY)})
}
export async function POST(request:Request) {
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Origen no permitido'},403)
 let user
 try {({user}=await requireFinanceAccess())}catch{return reply({error:'Sin permisos'},403)}
 if(Number(request.headers.get('content-length')||0)>16000)return reply({error:'Solicitud demasiado grande'},413)
 let data:z.infer<typeof command>
 try {const raw=await request.text();if(raw.length>16000)throw Error();data=command.parse(JSON.parse(raw))}catch{return reply({error:'Revisa los datos'},400)}
 const db=createAdminClient()
 try {
  if(data.action==='create') {
   if(data.kind!=='subscription') return reply({error:'Stripe se utiliza únicamente para mensualidades de Academia. Los demás recibos se gestionan por transferencia.'},409)
   const selected=await db.from('payments').select('id,type,concept_code,due_date').in('id',data.paymentIds)
   if(selected.error||selected.data.length!==data.paymentIds.length||selected.data.some(p=>p.type!=='academy'||p.concept_code!=='monthly'||!p.due_date?.endsWith('-01'))) return reply({error:'Selecciona solo mensualidades de Academia con vencimiento el día 1.'},409)
   const {mode}=configuredStripe(true)
   const result=await db.rpc('create_billing_request',{id_input:data.id,actor_input:user.id,child_input:data.childId,guardian_input:data.guardianId,kind_input:data.kind,mode_input:mode,title_input:data.title,payments_input:data.paymentIds})
   if(result.error)return reply({error:result.error.code==='P0001'?result.error.message:'No se pudo crear la solicitud'},409)
   return reply({id:result.data})
  }
  const {data:raw,error}=await db.from('billing_requests').select('*,billing_request_items(*)').eq('id',data.id).single()
  if(error||!raw)return reply({error:'Solicitud no disponible'},404)
  const r=raw as BillingRequest & {recipient_email:string|null}
  if(data.action==='email') {
   if(raw.kind!=='subscription') return reply({error:'Este cobro se gestiona por transferencia.'},409)
   if(r.state!=='ready'||new Date(r.expires_at).getTime()<=Date.now())return reply({error:'La solicitud está cerrada o caducada'},409)
   const mode=await stripeCheckoutMode()
   if(mode!==r.mode||r.kind==='subscription'&&mode==='live'&&process.env.STRIPE_RECURRING_PAYMENTS_ENABLED!=='true')return reply({error:'No se envía todavía: esta modalidad de pago está pendiente de activación'},409)
   const linkOrigin=stripePaymentOrigin(request.headers.get('origin'),mode,process.env.VERCEL_URL)
   if(!z.string().email().safeParse(r.recipient_email).success)return reply({error:'El tutor no tiene un email válido'},400)
   if(!process.env.RESEND_API_KEY)return reply({error:'Falta configurar el envío de correo. Puedes copiar el enlace.'},503)
   if(r.email_status==='accepted')return reply({message:'El proveedor ya aceptó este correo. Esto no confirma su lectura.'})
   const content=await preparePaymentRequestEmail(r,linkOrigin)
   const claim=await db.from('billing_requests').update({email_status:'sending'}).eq('id',r.id).in('email_status',['not_sent','failed']).select('id')
   if(claim.error||!claim.data?.length)return reply({error:'El correo ya se está enviando. Actualiza antes de repetir.'},409)
   try {
    const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`billing-request-${r.id}`},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||'Academy Costa Brava <info@academycostabrava.com>',to:[r.recipient_email],reply_to:'costabravaacademy@gmail.com',...content})})
    if(!response.ok)throw Error('Provider rejected')
    const provider=await response.json();if(typeof provider.id!=='string')throw Error('Invalid provider response')
    const saved=await db.from('billing_requests').update({email_status:'accepted',email_provider_id:provider.id,email_sent_at:new Date().toISOString()}).eq('id',r.id)
    if(saved.error)throw saved.error
    return reply({message:'Correo aceptado por el proveedor. La entrega al buzón y la lectura aún no están confirmadas.'})
   }catch{await db.from('billing_requests').update({email_status:'failed'}).eq('id',r.id);return reply({error:'No se pudo confirmar el envío. Puedes reintentarlo sin crear otra solicitud.'},502)}
  }
  if(r.state==='completed')return reply({error:'Solicitud cobrada: las devoluciones requieren conciliación. No se anula el historial.'},409)
  const claimCancel=await db.rpc('cancel_billing_request',{request_input:r.id,actor_input:user.id,finish_input:false});if(claimCancel.error)throw claimCancel.error
  const {data:attempts,error:ae}=await db.from('billing_request_attempts').select('*').eq('request_id',r.id).not('state','in','(expired,cancelled)')
  if(ae)throw ae
  const {stripe,mode}=configuredStripe(true);if(mode!==r.mode)throw Error('Wrong mode')
  for(const a of (attempts||[]) as BillingAttempt[]) {
   if(a.schedule_id) {
    const schedule=await stripe.subscriptionSchedules.retrieve(a.schedule_id)
    if(['active','not_started'].includes(schedule.status))await stripe.subscriptionSchedules.cancel(a.schedule_id,{invoice_now:false,prorate:false},{idempotencyKey:`billing-cancel-${a.id}`})
   } else if(a.session_id) {
    const session=await stripe.checkout.sessions.retrieve(a.session_id)
    if(session.status==='complete')return reply({error:'Stripe está confirmando la autorización o el pago. Espera antes de cancelar.'},409)
    if(session.status==='open')await stripe.checkout.sessions.expire(a.session_id)
   } else if(new Date(a.expires_at).getTime()>Date.now())return reply({error:'Hay un intento en preparación. Espera a que caduque y vuelve a cancelar.'},409)
   const changed=await db.from('billing_request_attempts').update({state:'cancelled',billing_status:'ended'}).eq('id',a.id).neq('state','completed');if(changed.error)throw changed.error
  }
  const cancelled=await db.rpc('cancel_billing_request',{request_input:r.id,actor_input:user.id,finish_input:true});if(cancelled.error)throw cancelled.error
  return reply({message:'Solicitud cancelada. No se han borrado ni anulado recibos; revisa cualquier saldo pendiente.'})
 }catch{return reply({error:'No se pudo confirmar la operación. Revisa su estado antes de repetir.'},502)}
}
