import 'server-only'
import type Stripe from 'stripe'
import { configuredStripe } from './stripe-payments'
import { createAdminClient } from './supabase/admin'
import { billingSummary, type BillingRequest, type BillingAttempt } from './billing-request'

const purpose='academy_billing_request'
export function billingScheduleParams(customer:string,paymentMethod:string,price:string,start:number,months:number,metadata:Record<string,string>):Stripe.SubscriptionScheduleCreateParams {
 return {customer,start_date:start,end_behavior:'cancel',metadata,
  default_settings:{default_payment_method:paymentMethod,collection_method:'charge_automatically'},
  phases:[{duration:{interval:'month',interval_count:months},items:[{price,quantity:1}],proration_behavior:'none',discounts:'',metadata}]}
}
async function loadAttempt(id: string) {
 const db=createAdminClient()
 const {data:a,error}=await db.from('billing_request_attempts').select('*').eq('id',id).single()
 if(error||!a)throw Error('Attempt unavailable')
 const {data:r,error:re}=await db.from('billing_requests').select('*,billing_request_items(*)').eq('id',a.request_id).single()
 if(re||!r)throw Error('Request unavailable')
 return {db,a:a as BillingAttempt,r:r as BillingRequest}
}
export async function createBillingCheckout(r: BillingRequest,a: BillingAttempt,email: string,origin: string) {
 const {stripe,mode}=configuredStripe()
 if(mode!==r.mode)throw Error('Environment mismatch')
 const metadata={purpose,billing_attempt_id:a.id}
 const common={locale:'es' as const,payment_method_types:['card'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],metadata,
  expires_at:Math.floor(new Date(a.expires_at).getTime()/1000),
  success_url:`${origin}/pago/resultado?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/pago/resultado?cancelled=1`}
 if(r.kind==='payment')return stripe.checkout.sessions.create({...common,mode:'payment',customer_email:email,payment_intent_data:{metadata},
  line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:Number(r.total_cents),product_data:{name:r.title}}}]}, {idempotencyKey:`billing-checkout-${a.id}`})
 const customer=await stripe.customers.create({email,metadata},{idempotencyKey:`billing-customer-${a.id}`})
 return stripe.checkout.sessions.create({...common,mode:'setup',currency:'eur',customer:customer.id,
  setup_intent_data:{metadata,description:billingSummary(r)},custom_text:{submit:{message:billingSummary(r)}}},{idempotencyKey:`billing-checkout-${a.id}`})
}

export async function fulfillBillingCheckout(session: Stripe.Checkout.Session,eventType: string) {
 const id=session.metadata?.billing_attempt_id
 if(!id)throw Error('Missing attempt')
 const {db,a,r}=await loadAttempt(id)
 const {stripe,mode}=configuredStripe(true)
 if(r.mode!==mode||session.livemode!==(mode==='live')||a.session_id!==session.id)throw Error('Session mismatch')
 if(eventType==='checkout.session.expired') {
  const {data,error}=await db.from('billing_request_attempts').update({state:'expired'}).eq('id',a.id).in('state',['creating','open']).select('id')
  if(error)throw error
  if(data?.length) {const res=await db.from('billing_requests').update({state:'ready'}).eq('id',r.id).eq('state','processing');if(res.error)throw res.error}
  return
 }
 if(eventType==='checkout.session.async_payment_failed') {
  const failed=await db.from('billing_request_attempts').update({billing_status:'attention'}).eq('id',a.id).in('state',['creating','open']);if(failed.error)throw failed.error
  return
 }
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(eventType))return
 if(r.kind==='payment') {
  if(session.payment_status!=='paid')return
  if(session.currency!=='eur'||session.amount_total!==Number(r.total_cents))throw Error('Amount mismatch')
  const result=await db.rpc('collect_billing_request',{attempt_input:a.id,collection_input:session.id,session_input:session.id,subscription_input:null,livemode_input:session.livemode,amount_input:session.amount_total,due_input:null})
  if(result.error)throw result.error
  return
 }
 if(a.schedule_id) {
  // Recover a previous delivery that bound the schedule but failed while
  // updating the request. Never create a second schedule on a webhook retry.
  const recovered=await db.from('billing_requests').update({state:'active'}).eq('id',r.id).eq('state','processing');if(recovered.error)throw recovered.error
  return
 }
 if(['cancelling','cancelled'].includes(r.state)) {
  const stopped=await db.from('billing_request_attempts').update({state:'cancelled',billing_status:'ended'}).eq('id',a.id).in('state',['creating','open']);if(stopped.error)throw stopped.error
  return
 }
 const setupId=typeof session.setup_intent==='string'?session.setup_intent:session.setup_intent?.id
 if(!setupId)throw Error('Missing setup')
 const setup=await stripe.setupIntents.retrieve(setupId)
 const customer=typeof setup.customer==='string'?setup.customer:setup.customer?.id
 const pm=typeof setup.payment_method==='string'?setup.payment_method:setup.payment_method?.id
 const sc=typeof session.customer==='string'?session.customer:session.customer?.id
 if(setup.status!=='succeeded'||setup.livemode!==session.livemode||setup.metadata?.billing_attempt_id!==a.id||!pm||!customer||customer!==sc)throw Error('Setup not authorized')
 const items=[...r.billing_request_items].sort((x,y)=>x.position-y.position)
 const start=Math.floor(new Date(items[0].due_date+'T12:00:00Z').getTime()/1000)
 if(start<=Math.floor(Date.now()/1000))throw Error('Start date passed: manual review required')
 const price=await stripe.prices.create({currency:'eur',unit_amount:Number(items[0].amount_cents),recurring:{interval:'month'},product_data:{name:r.title},metadata:{billing_attempt_id:a.id}},{idempotencyKey:`billing-price-${a.id}`})
 const schedule=await stripe.subscriptionSchedules.create(billingScheduleParams(customer,pm,price.id,start,items.length,{purpose,billing_attempt_id:a.id}), {idempotencyKey:`billing-schedule-${a.id}`})
 if(schedule.livemode!==session.livemode||schedule.end_behavior!=='cancel')throw Error('Invalid schedule')
 const sub=typeof schedule.subscription==='string'?schedule.subscription:schedule.subscription?.id||null
 const saved=await db.from('billing_request_attempts').update({schedule_id:schedule.id,subscription_id:sub,price_id:price.id,state:'active',billing_status:'scheduled'}).eq('id',a.id).in('state',['creating','open']).select('id')
 if(saved.error||!saved.data?.length)throw Error('Schedule binding pending')
 const updated=await db.from('billing_requests').update({state:'active'}).eq('id',r.id).eq('state','processing');if(updated.error)throw updated.error
}

async function bindSubscription(subscription: Stripe.Subscription) {
 const {db,a,r}=await loadAttempt(subscription.metadata.billing_attempt_id)
 if(subscription.livemode!==(r.mode==='live'))throw Error('Mode mismatch')
 const scheduleId=typeof subscription.schedule==='string'?subscription.schedule:subscription.schedule?.id
 if(a.subscription_id!==subscription.id) {
  if(a.subscription_id||!a.schedule_id||scheduleId!==a.schedule_id)throw Error('Schedule binding pending')
  const res=await db.from('billing_request_attempts').update({subscription_id:subscription.id}).eq('id',a.id).is('subscription_id',null);if(res.error)throw res.error
 }
 return {db,a,r}
}
export async function syncBillingSubscription(subscriptionId: string) {
 const {stripe}=configuredStripe(true)
 const sub=await stripe.subscriptions.retrieve(subscriptionId)
 if(sub.metadata.purpose!==purpose)return false
 const {db,a}=await bindSubscription(sub)
 const billing_status=sub.status==='canceled'?'ended':['past_due','unpaid','incomplete','incomplete_expired','paused'].includes(sub.status)?'attention':'active'
 const res=await db.from('billing_request_attempts').update({billing_status}).eq('id',a.id);if(res.error)throw res.error
 return true
}
export async function fulfillBillingInvoice(invoice: Stripe.Invoice) {
 const legacy=invoice as Stripe.Invoice & {subscription?:string|{id:string}}
 const value=invoice.parent?.subscription_details?.subscription||legacy.subscription
 const subId=typeof value==='string'?value:value?.id
 if(!subId)return false
 const {stripe}=configuredStripe(true)
 const sub=await stripe.subscriptions.retrieve(subId)
 if(sub.metadata.purpose!==purpose)return false
 const {db,a,r}=await bindSubscription(sub)
 if(invoice.status!=='paid'||invoice.currency!=='eur'||invoice.livemode!==(r.mode==='live')||!['subscription_create','subscription_cycle'].includes(invoice.billing_reason||''))throw Error('Unexpected invoice')
 const lines=await stripe.invoices.listLineItems(invoice.id!,{limit:100})
 const line=lines.data.find(l=>l.pricing?.price_details?.price===a.price_id)
 if(!line||lines.data.length!==1||line.amount!==invoice.amount_paid)throw Error('Unexpected invoice lines')
 const due=new Date(line.period.start*1000).toISOString().slice(0,10)
 const result=await db.rpc('collect_billing_request',{attempt_input:a.id,collection_input:invoice.id,session_input:null,subscription_input:subId,livemode_input:invoice.livemode,amount_input:invoice.amount_paid,due_input:due})
 if(result.error)throw result.error
 return true
}
