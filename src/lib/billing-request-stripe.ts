import 'server-only'
import type Stripe from 'stripe'
import { configuredStripe } from './stripe-payments'
import { createAdminClient } from './supabase/admin'
import { billingParts, billingMonthly, familyBilling, billingItemLabel, billingSummary, type BillingRequest, type BillingAttempt } from './billing-request'

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
 const {initial,recurring}=billingParts(r)
 if(initial.length) return stripe.checkout.sessions.create({...common,mode:'payment',customer:customer.id,
  payment_intent_data:{metadata,...(recurring.length?{setup_future_usage:'off_session' as const}:{})},
  custom_text:{submit:{message:billingSummary(r)}},
  line_items:initial.map(item=>({quantity:1,price_data:{currency:'eur',unit_amount:Number(item.amount_cents),product_data:{name:(billingItemLabel(item)||'Alta Academia').slice(0,250)}}})),
 },{idempotencyKey:`billing-checkout-${a.id}`})
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
 const {initial,recurring:items,initialCents}=billingParts(r)
 let customer:string|undefined,pm:string|undefined
 if(initial.length) {
  if(session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid')return
  if(session.currency!=='eur'||session.amount_total!==initialCents)throw Error('Initial amount mismatch')
  const piId=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id
  if(!piId)throw Error('Missing initial payment')
  const payment=await stripe.paymentIntents.retrieve(piId)
  customer=typeof payment.customer==='string'?payment.customer:payment.customer?.id
  pm=typeof payment.payment_method==='string'?payment.payment_method:payment.payment_method?.id
  const sc=typeof session.customer==='string'?session.customer:session.customer?.id
  if(payment.status!=='succeeded'||payment.livemode!==session.livemode||payment.currency!=='eur'||payment.amount_received!==initialCents||payment.metadata?.billing_attempt_id!==a.id||!customer||customer!==sc||!pm||(items.length&&payment.setup_future_usage!=='off_session'))throw Error('Initial payment not authorized')
  const collected=await db.rpc('collect_billing_initial',{attempt_input:a.id,session_input:session.id,livemode_input:session.livemode,amount_input:initialCents})
  if(collected.error)throw collected.error
  if(!items.length)return
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
 if(!initial.length) {
  const setupId=typeof session.setup_intent==='string'?session.setup_intent:session.setup_intent?.id
  if(!setupId)throw Error('Missing setup')
  const setup=await stripe.setupIntents.retrieve(setupId)
  customer=typeof setup.customer==='string'?setup.customer:setup.customer?.id
  pm=typeof setup.payment_method==='string'?setup.payment_method:setup.payment_method?.id
  const sc=typeof session.customer==='string'?session.customer:session.customer?.id
  if(setup.status!=='succeeded'||setup.livemode!==session.livemode||setup.metadata?.billing_attempt_id!==a.id||!pm||!customer||customer!==sc)throw Error('Setup not authorized')
 }
 if(!customer||!pm||!items.length)throw Error('Monthly authorization missing')
 const months=billingMonthly(r)
 const start=Math.floor(new Date(months[0].due_date+'T12:00:00Z').getTime()/1000)
 if(start<=Math.floor(Date.now()/1000))throw Error('Start date passed: manual review required')
 let firstPriceId: string
 let schedule: Stripe.SubscriptionSchedule
 if(familyBilling(r)) {
  const phases: Stripe.SubscriptionScheduleCreateParams.Phase[]=[]
  for(let index=0;index<months.length;index++) {
   const month=months[index]
   const price=await stripe.prices.create({currency:'eur',unit_amount:month.amount_cents,recurring:{interval:'month'},product_data:{name:r.title},metadata:{billing_attempt_id:a.id,family_billing:'true'}},{idempotencyKey:`billing-family-price-${a.id}-${month.amount_cents}`})
   if(index===0) firstPriceId=price.id
   phases.push({duration:{interval:'month',interval_count:1},items:[{price:price.id,quantity:1}],proration_behavior:'none',discounts:'',metadata:{purpose,billing_attempt_id:a.id}})
  }
  schedule=await stripe.subscriptionSchedules.create({customer,start_date:start,end_behavior:'cancel',metadata:{purpose,billing_attempt_id:a.id},default_settings:{default_payment_method:pm,collection_method:'charge_automatically'},phases},{idempotencyKey:`billing-schedule-${a.id}`})
 } else {
  const price=await stripe.prices.create({currency:'eur',unit_amount:Number(items[0].amount_cents),recurring:{interval:'month'},product_data:{name:r.title},metadata:{billing_attempt_id:a.id}},{idempotencyKey:`billing-price-${a.id}`})
  firstPriceId=price.id
  schedule=await stripe.subscriptionSchedules.create(billingScheduleParams(customer,pm,price.id,start,items.length,{purpose,billing_attempt_id:a.id}),{idempotencyKey:`billing-schedule-${a.id}`})
 }
 if(schedule.livemode!==session.livemode||schedule.end_behavior!=='cancel')throw Error('Invalid schedule')
 const sub=typeof schedule.subscription==='string'?schedule.subscription:schedule.subscription?.id||null
 const saved=await db.from('billing_request_attempts').update({schedule_id:schedule.id,subscription_id:sub,price_id:firstPriceId!,state:'active',billing_status:'scheduled'}).eq('id',a.id).in('state',['creating','open']).select('id')
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
 const sub=await stripe.subscriptions.retrieve(subscriptionId,{expand:['latest_invoice']})
 if(sub.metadata.purpose!==purpose)return false
 const {db,a}=await bindSubscription(sub)
 const latest=typeof sub.latest_invoice==='object'?sub.latest_invoice:null
 const attention=['past_due','unpaid','incomplete','incomplete_expired','paused'].includes(sub.status)||(latest?.status==='open'&&latest.attempt_count>0)
 const billing_status=sub.status==='canceled'?'ended':attention?'attention':'active'
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
 const line=familyBilling(r)?lines.data[0]:lines.data.find(l=>l.pricing?.price_details?.price===a.price_id)
 if(!line||lines.data.length!==1||line.amount!==invoice.amount_paid)throw Error('Unexpected invoice lines')
 const due=new Date(line.period.start*1000).toISOString().slice(0,10)
 if(familyBilling(r)) {
  const priceId=line.pricing?.price_details?.price
  if(!priceId)throw Error('Missing family price')
  const price=typeof priceId==='string'?await stripe.prices.retrieve(priceId):priceId
  const month=billingMonthly(r).find(m=>m.due_date===due)
  if(!month||price.metadata.billing_attempt_id!==a.id||price.metadata.family_billing!=='true'||price.currency!=='eur'||price.unit_amount!==month.amount_cents||invoice.amount_paid!==month.amount_cents)throw Error('Unexpected family invoice')
 }
 const result=await db.rpc('collect_billing_request',{attempt_input:a.id,collection_input:invoice.id,session_input:null,subscription_input:subId,livemode_input:invoice.livemode,amount_input:invoice.amount_paid,due_input:due})
 if(result.error)throw result.error
 return true
}
