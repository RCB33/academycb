import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe } from '@/lib/stripe-payments'
import { requireStripeCheckout } from '@/lib/stripe-availability'
import { createBillingCheckout } from '@/lib/billing-request-stripe'
import type { BillingRequest, BillingAttempt } from '@/lib/billing-request'
import { stripePaymentOrigin } from '@/lib/stripe-return-origin'
import { z } from 'zod'
export const maxDuration=60
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Origen no permitido'},403)
 try {
  const {id}=await params;if(!z.string().uuid().safeParse(id).success)return reply({error:'Solicitud no válida'},400)
  const {user,supabase}=await requireUser()
  if(!user.email||!user.email_confirmed_at)return reply({error:'Verifica tu correo antes de continuar'},403)
  const text=await request.text();if(text.length>1000)return reply({error:'Solicitud no válida'},400)
  const consent=z.object({accepted:z.literal(true),totalCents:z.number().int().min(50)}).parse(JSON.parse(text))
  const {data,error}=await supabase.from('billing_requests').select('*,billing_request_items(*)').eq('id',id).single()
  if(error||!data)return reply({error:'Solicitud no disponible para esta cuenta'},404)
  const r=data as BillingRequest
  await requireStripeCheckout()
  const {stripe,mode}=configuredStripe()
  if(r.mode!==mode)return reply({error:'Entorno de pago incorrecto'},409)
  if(r.kind==='subscription'&&mode==='live'&&process.env.STRIPE_RECURRING_PAYMENTS_ENABLED!=='true')return reply({error:'Las mensualidades automáticas aún no están habilitadas. Contacta con Academy.'},409)
  const origin=stripePaymentOrigin(request.headers.get('origin'),mode,process.env.VERCEL_URL)
  const db=createAdminClient()
  const reserved=await db.rpc('reserve_billing_request',{request_input:id,owner_input:user.id,mode_input:mode,total_input:consent.totalCents})
  if(reserved.error||!reserved.data)return reply({error:'El recibo ha cambiado, el enlace ha caducado o no corresponde a tu cuenta. Contacta con Academy.'},409)
  const a=reserved.data as BillingAttempt
  if(['active','completed'].includes(a.state))return reply({error:'Esta solicitud ya está autorizada o cobrada. No repitas el proceso.'},409)
  if(a.session_id) {
   const existing=await stripe.checkout.sessions.retrieve(a.session_id)
   if(existing.status==='complete')return reply({error:'Estamos confirmando con Stripe. Actualiza en unos segundos.'},409)
   if(existing.status==='expired') {
    await db.from('billing_request_attempts').update({state:'expired'}).eq('id',a.id).in('state',['creating','open'])
    await db.from('billing_requests').update({state:'ready'}).eq('id',id).eq('state','processing')
    return reply({error:'El intento ha caducado. Vuelve a continuar para obtener uno nuevo.'},409)
   }
   if(existing.livemode!==(mode==='live')||!existing.url?.startsWith('https://checkout.stripe.com/'))throw Error('Invalid session')
   return reply({url:existing.url})
  }
  if(new Date(a.expires_at).getTime()<=Date.now())return reply({error:'Intento pendiente de conciliación. Contacta con Academy.'},409)
  const session=await createBillingCheckout(r,a,user.email,origin)
  if(session.livemode!==(mode==='live')||!session.url?.startsWith('https://checkout.stripe.com/'))throw Error('Invalid session')
  const saved=await db.rpc('bind_billing_checkout',{attempt_input:a.id,session_input:session.id,url_input:session.url})
  if(saved.error)throw Error('Binding failed; retry same attempt')
  if(saved.data!==true) {
   await stripe.checkout.sessions.expire(session.id)
   await db.from('billing_request_attempts').update({state:'cancelled',session_id:session.id}).eq('id',a.id).eq('state','creating')
   return reply({error:'Administración está cancelando esta solicitud. No se ha iniciado ningún cobro.'},409)
  }
  return reply({url:session.url})
 }catch{return reply({error:'No se pudo iniciar el pago. No se ha confirmado ningún cargo; consulta el estado antes de reintentar.'},409)}
}
