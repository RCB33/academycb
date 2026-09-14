const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const c = { id:'11111111-1111-4111-8111-111111111111',mode:'test',choice:'monthly',state:'open',plan_name:'Academy',unit_cents:3000,fee_cents:1000,months:3,total_cents:10000,return_origin:'https://preview.example.com',expires_at:new Date(Date.now()+3600000).toISOString(),stripe_session_id:'cs_test_contract',stripe_schedule_id:null }
const seen = { checkout:[],prices:[],schedules:[],updates:[],collections:[] }
let setupCustomer='cus_unit', subStatus='active', latestStatus='paid', dbFails=false
const stripe = {
 checkout:{sessions:{create:async(p,o)=>{seen.checkout.push([p,o]);return {id:c.stripe_session_id,livemode:false,url:'https://checkout.stripe.com/test'}}}},
 customers:{create:async()=>({id:'cus_unit'})},
 setupIntents:{retrieve:async()=>({status:'succeeded',livemode:false,metadata:{academy_contract_id:c.id},customer:setupCustomer,payment_method:'pm_unit'})},
 prices:{create:async(p,o)=>{seen.prices.push([p,o]);return{id:'price_unit',product:'prod_unit'}}},
 subscriptionSchedules:{create:async(p,o)=>{seen.schedules.push([p,o]);return{id:'sub_sched_unit',subscription:'sub_unit',livemode:false,end_behavior:p.end_behavior}}},
 subscriptions:{retrieve:async()=>({id:'sub_unit',livemode:false,metadata:{purpose:'academy_contract',academy_contract_id:c.id},status:subStatus,latest_invoice:{status:latestStatus,attempt_count:1}})},
}
function query() {
 let update=null
 const q = {select:()=>q,eq:()=>q,is:()=>q,in:()=>q,single:async()=>({data:{...c},error:null}),update:p=>{update=p;seen.updates.push(p);return q},then:(resolve,reject)=>Promise.resolve({data:update ? [{id:c.id}] : [c],error:dbFails ? {} : null}).then(resolve,reject)}
 return q
}
const admin = {from:query,rpc:async(name,args)=>{seen.collections.push([name,args]);return{error:dbFails ? {} : null}}}
const moduleResult={exports:{}}
const compiled=ts.transpileModule(fs.readFileSync('src/lib/academy-stripe-contract.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
new Function('module','exports','require',compiled)(moduleResult,moduleResult.exports,name=>{
 if(name==='server-only')return{}
 if(name==='./stripe-payments')return{configuredStripe:()=>({stripe,mode:'test'})}
 if(name==='./supabase/admin')return{createAdminClient:()=>admin}
 throw new Error(`Unexpected dependency: ${name}`)
})
const api=moduleResult.exports
;(async()=>{
 await api.createAcademyCheckout(c,'qa@example.com')
 let [p,o]=seen.checkout.at(-1)
 assert.equal(p.mode,'setup');assert.equal(p.customer,'cus_unit');assert.equal(p.payment_intent_data,undefined)
 assert.match(p.custom_text.submit.message,/3 mensualidades/);assert.match(p.custom_text.submit.message,/Sin renovación/)
 assert.equal(p.success_url,`${c.return_origin}/portal/pagos?contract=${c.id}`)
 const session={id:c.stripe_session_id,livemode:false,customer:'cus_unit',setup_intent:'seti_unit',metadata:{academy_contract_id:c.id}}
 setupCustomer='cus_foreign'
 await assert.rejects(()=>api.fulfillAcademyCheckout(session,'checkout.session.completed'))
 assert.equal(seen.schedules.length,0)
 setupCustomer='cus_unit'
 await api.fulfillAcademyCheckout(session,'checkout.session.completed')
 ;[p,o]=seen.schedules.at(-1)
 assert.equal(p.end_behavior,'cancel');assert.deepEqual(p.phases[0].duration,{interval:'month',interval_count:3})
 assert.equal(p.phases.length,1);assert.equal(p.phases[0].items[0].quantity,1)
 assert.equal(p.phases[0].add_invoice_items[0].price_data.unit_amount,1000)
 assert.equal(seen.prices[0][0].unit_amount,3000);assert.equal(p.default_settings.default_payment_method,'pm_unit')
 assert.equal(seen.collections.length,0,'Authorizing card must not mark payment paid')
 await api.fulfillAcademyCheckout(session,'checkout.session.completed')
 assert.equal(seen.schedules.at(-1)[1].idempotencyKey,o.idempotencyKey)
 const invoice={id:'in_unit',livemode:false,subscription:'sub_unit',status:'paid',currency:'eur',billing_reason:'subscription_create',amount_paid:4000}
 await api.fulfillAcademyInvoice(invoice)
 assert.equal(seen.collections.at(-1)[1].amount_input,4000);assert.equal(seen.collections.at(-1)[1].first_input,true)
 await api.fulfillAcademyInvoice({...invoice,id:'in_cycle',subscription:undefined,parent:{subscription_details:{subscription:'sub_unit'}},billing_reason:'subscription_cycle',amount_paid:3000})
 assert.equal(seen.collections.at(-1)[1].first_input,false)
 await assert.rejects(()=>api.fulfillAcademyInvoice({...invoice,status:'open'}))
 const paidCount=seen.collections.length
 subStatus='past_due';latestStatus='open'
 await api.syncAcademyInvoiceStatus(invoice)
 assert.equal(seen.updates.at(-1).billing_status,'attention');assert.equal(seen.collections.length,paidCount)
 subStatus='canceled'
 await api.syncAcademySubscription('sub_unit')
 assert.equal(seen.updates.at(-1).billing_status,'ended')
 dbFails=true
 await assert.rejects(()=>api.fulfillAcademyInvoice(invoice))
 dbFails=false
 await api.createAcademyCheckout({...c,choice:'full'},'qa@example.com')
 ;[p]=seen.checkout.at(-1)
 assert.equal(p.mode,'payment');assert.equal(p.line_items[0].price_data.unit_amount,10000)
 console.log('PASS: setup before charges, customer binding, finite monthly schedule, one-time fee, stable idempotency, full payment, old/new invoice shapes, failure/cancellation status, retry on database failure. Mocked Stripe: no network or charges.')
})().catch(error=>{console.error(error);process.exitCode=1})
