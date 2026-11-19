// Isolated provider lifecycle test. Hard-disabled in production; no Academy
// receipts, customers or subscriptions are touched. Only named TEST fixtures.
import { requireAdmin } from '@/lib/auth'
import { configuredStripe } from '@/lib/stripe-payments'
import { billingScheduleParams } from '@/lib/billing-request-stripe'
import { z } from 'zod'
export const maxDuration=60
const schema=z.object({action:z.enum(['start','status','advance','cleanup']),id:z.string().uuid(),clockId:z.string().regex(/^clock_[A-Za-z0-9]+$/).optional(),timestamp:z.number().int().optional()})
export async function POST(request:Request) {
 if(process.env.VERCEL_ENV!=='preview')return new Response(null,{status:404})
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403})
 let user
 try{({user}=await requireAdmin())}catch{return new Response(null,{status:403})}
 let clockId:string|undefined
 let stage='validate'
 try {
  const text=await request.text();if(text.length>1000)throw Error('Invalid request')
  const input=schema.parse(JSON.parse(text)),{stripe,mode}=configuredStripe(true)
  if(mode!=='test')return new Response(null,{status:404})
  const name=`academy-billing-qa:${user.id}:${input.id}`,metadata={purpose:'academy_billing_provider_probe',qa_owner:user.id,qa_id:input.id}
  clockId=input.clockId
  if(input.action==='start') {
   stage='create_test_clock'
   const clock=await stripe.testHelpers.testClocks.create({frozen_time:Date.parse('2027-01-01T12:00:00Z')/1000,name},{idempotencyKey:`billing-clock-${input.id}`});clockId=clock.id
   stage='create_test_price'
   const price=await stripe.prices.create({currency:'eur',unit_amount:100,recurring:{interval:'month'},product_data:{name:'QA TEST — no venta'},metadata},{idempotencyKey:`billing-clock-price-${input.id}`})
   const ids=[]
   for(const [label,method] of [['success','pm_card_visa'],['failure','pm_card_chargeCustomerFail']]) {
    stage='create_test_customer'
    const customer=await stripe.customers.create({name:'QA TEST — '+label,test_clock:clock.id,payment_method:method,metadata:{...metadata,price_id:price.id}},{idempotencyKey:`billing-clock-customer-${input.id}-${label}`})
    stage='read_test_payment_method'
    const methods=await stripe.customers.listPaymentMethods(customer.id,{type:'card',limit:1})
    if(!methods.data[0])throw Error('Missing test card')
    stage='create_test_schedule'
    const schedule=await stripe.subscriptionSchedules.create(billingScheduleParams(customer.id,methods.data[0].id,price.id,Date.parse('2027-01-05T12:00:00Z')/1000,2,metadata),{idempotencyKey:`billing-clock-schedule-${input.id}-${label}`})
    ids.push({label,customerId:customer.id,scheduleId:schedule.id})
   }
   return Response.json({clockId,fixtures:ids})
  }
  if(!clockId)throw Error('Missing clock')
  const clock=await stripe.testHelpers.testClocks.retrieve(clockId)
  if(clock.livemode||clock.name!==name)return new Response(null,{status:403})
  if(input.action==='advance') {
   if(!input.timestamp||input.timestamp<=clock.frozen_time||input.timestamp-clock.frozen_time>60*86400)throw Error('Invalid time')
   await stripe.testHelpers.testClocks.advance(clockId,{frozen_time:input.timestamp})
   return Response.json({clockId,status:'advancing'})
  }
  const customers=await stripe.customers.list({test_clock:clockId,limit:10})
  if(input.action==='cleanup') {
   const prices=[...new Set(customers.data.map(c=>c.metadata.price_id).filter(Boolean))]
   await stripe.testHelpers.testClocks.del(clockId)
   for(const id of prices){const p=await stripe.prices.retrieve(id);if(p.metadata.qa_owner===user.id&&p.metadata.qa_id===input.id){await stripe.prices.update(id,{active:false});const product=typeof p.product==='string'?p.product:p.product.id;await stripe.products.update(product,{active:false})}}
   return Response.json({deleted:true})
  }
  const rows=[]
  for(const c of customers.data) {
   const [invoices,subscriptions]=await Promise.all([stripe.invoices.list({customer:c.id,limit:10}),stripe.subscriptions.list({customer:c.id,status:'all',limit:10})])
   rows.push({name:c.name,invoices:invoices.data.map(i=>({id:i.id,status:i.status,paid:i.amount_paid,due:i.amount_due,attempted:i.attempted,reason:i.billing_reason})),subscriptions:subscriptions.data.map(s=>({id:s.id,status:s.status}))})
  }
  return Response.json({clockId,status:clock.status,time:clock.frozen_time,customers:rows})
 }catch(e) {
  // Return only structured provider error codes, never keys or request bodies.
  const error=e as {type?:string;code?:string;param?:string;message?:string}
  const permissions=[...new Set(error.message?.match(/\b(?:rak|r)_[a-z_]+\b/g)||[])]
  return Response.json({error:'TEST provider operation failed',stage,type:error.type,code:error.code,param:error.param,permissions,clockId},{status:502})
 }
}
