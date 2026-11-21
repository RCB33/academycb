import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe } from '@/lib/stripe-payments'
import { billingParts, billingSummary, billingItemLabel, euros, type BillingRequest } from '@/lib/billing-request'

export async function prepareFamilyBilling(batchId:string,actorId:string) {
 if(process.env.STRIPE_RECURRING_PAYMENTS_ENABLED!=='true')return {status:'pending_activation',batchId}
 try {
  const {mode}=configuredStripe(true)
  const {data,error}=await createAdminClient().rpc('prepare_family_billing',{batch_input:batchId,actor_input:actorId,mode_input:mode})
  if(error)return {status:'needs_review',batchId,error:error.code==='P0001'?error.message:'Revisa el pago familiar antes de enviar el enlace.'}
  return data as {status:string;requestId?:string;pending?:number;batchId?:string}
 } catch {return {status:'needs_review',batchId,error:'No se pudo preparar el pago familiar. Revisa su estado antes de reintentar.'}}
}

export async function familyBillingEmail(batchId:string) {
 const db=createAdminClient()
 const {data:members,error}=await db.from('family_billing_members').select('request_id,request:enrollment_requests(child_name,status)').eq('batch_id',batchId)
 if(error||!members?.length)throw Error('Family payment unavailable')
 const names=members.flatMap(m=>Array.isArray(m.request)?m.request:[m.request]).filter(Boolean)
 const {data:r,error:readError}=await db.from('billing_requests').select('*,billing_request_items(*)').eq('id',batchId).maybeSingle()
 if(readError)throw readError
 if(!r)return {message:`Pago familiar conjunto: ${names.map(n=>`${n.child_name} (${n.status==='enrolled'?'plaza aceptada':n.status==='lost'?'no incluida':'pendiente de revisión'})`).join(' · ')}.\nTe enviaremos un único enlace para los hijos que paguen con tarjeta cuando estén resueltas las plazas y listo el pago familiar. Todavía no realices pagos individuales.`}
 const request=r as BillingRequest, {initial,initialCents}=billingParts(request)
 const message=`Pago familiar conjunto\n${initial.map(i=>`${billingItemLabel(i)}: ${euros(i.amount_cents)}`).join('\n')}\n\nTotal del primer pago familiar: ${euros(initialCents)}.\n${billingSummary(request)}`
 const available=request.state==='ready'&&new Date(request.expires_at).getTime()>Date.now()
 return {message:message+(available?'\nUn solo pago para los hijos incluidos. No utilices enlaces individuales anteriores.':'\nConsulta el estado en el portal; no repitas un pago ya autorizado.'),action:available?{label:'Pagar el total familiar y activar mensualidades',href:`https://www.academycostabrava.com/portal/pagos/solicitud/${batchId}`}:undefined}
}
