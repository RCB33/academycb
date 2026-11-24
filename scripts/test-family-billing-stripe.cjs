const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path')
const attempt={id:'11111111-1111-4111-8111-111111111111',request_id:'22222222-2222-4222-8222-222222222222',state:'open',session_id:'cs_test_billing',schedule_id:null,subscription_id:null,price_id:null,expires_at:new Date(Date.now()+3600000).toISOString()}
const request={id:attempt.request_id,mode:'test',kind:'subscription',state:'processing',title:'Descuento acordado',total_cents:12000,billing_request_items:[{position:1,amount_cents:6000,due_date:'2090-01-05'},{position:2,amount_cents:6000,due_date:'2090-02-05'}]}
const seen={checkout:[],schedules:[],collections:[],updates:[]};let customer='cus_qa',status='active',failure=false,latestInvoice=null
let paymentStatus='succeeded',saveUsage='off_session',received=11750
const stripe={paymentIntents:{retrieve:async()=>({status:paymentStatus,livemode:false,currency:'eur',amount_received:received,metadata:{billing_attempt_id:attempt.id},customer,payment_method:'pm_qa',setup_future_usage:saveUsage})},checkout:{sessions:{create:async(p,o)=>{seen.checkout.push([p,o]);return {id:attempt.session_id,url:'https://checkout.stripe.com/test',livemode:false}}}},customers:{create:async()=>({id:'cus_qa'})},
 setupIntents:{retrieve:async()=>({status:'succeeded',livemode:false,metadata:{billing_attempt_id:attempt.id},customer,payment_method:'pm_qa'})},
 prices:{create:async p=>{assert.equal(p.unit_amount,6000);return{id:'price_qa'}}},
 subscriptionSchedules:{create:async(p,o)=>{seen.schedules.push([p,o]);return{id:'sched_qa',subscription:null,livemode:false,end_behavior:'cancel'}}},
 subscriptions:{retrieve:async()=>({id:'sub_qa',schedule:'sched_qa',metadata:{purpose:'academy_billing_request',billing_attempt_id:attempt.id},status,latest_invoice:latestInvoice,livemode:false})},
 invoices:{listLineItems:async()=>({data:[{pricing:{price_details:{price:'price_qa'}},amount:6000,period:{start:Date.parse('2090-01-05T12:00:00Z')/1000}}]})}}
function query(table){let update=null;const q={select:()=>q,eq:()=>q,in:()=>q,is:()=>q,update:p=>{update=p;seen.updates.push(p);return q},single:async()=>({data:{...(table==='billing_requests'?request:attempt)},error:null}),then:(ok,no)=>{if(update&&!failure)Object.assign(table==='billing_requests'?request:attempt,update);return Promise.resolve({data:update?[{id:attempt.id}]:[],error:failure?{}:null}).then(ok,no)}};return q}
const db={from:query,rpc:async(name,args)=>{seen.collections.push(args);return{error:failure?{}:null}}}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,name=>{if(name==='server-only')return{};if(name==='./stripe-payments')return{configuredStripe:()=>({stripe,mode:'test'})};if(name==='./supabase/admin')return{createAdminClient:()=>db};if(name==='./billing-request')return load(path.resolve('src/lib/billing-request.ts'));return require(name)});return m.exports}
const api=load(path.resolve('src/lib/billing-request-stripe.ts'))
;(async()=>{
 const item=(id,child,name,cents,due,phase,concept)=>({payment_id:id,position:Number(id),amount_cents:cents,due_date:due,phase,snapshot:{child_id:child,child_name:name,type:'academy',description:concept}})
 request.billing_request_items=[item('1','a','Ana',3750,'2090-01-16','initial','Primera cuota 50 %'),item('2','a','Ana',3000,'2090-01-16','initial','Matrícula'),item('3','a','Ana',5000,'2090-01-16','initial','Plus'),item('4','b','Berta',3500,'2090-02-23','initial','Primera cuota 25 %'),item('5','a','Ana',7500,'2090-02-01','recurring','Febrero'),item('6','a','Ana',7500,'2090-03-01','recurring','Marzo'),item('7','b','Berta',14000,'2090-03-01','recurring','Marzo')]
 request.total_cents=44250;received=15250
 const prices=new Map()
 stripe.prices.create=async(p,o)=>{const id='price_'+p.unit_amount;prices.set(id,{...p,id});return{id}}
 stripe.prices.retrieve=async id=>prices.get(id)
 const util=load(path.resolve('src/lib/billing-request.ts'))
 assert.deepEqual(util.billingMonthly(request),[{due_date:'2090-02-01',amount_cents:7500},{due_date:'2090-03-01',amount_cents:21500}])
 assert.match(util.billingSummary(request),/152,50/);assert.match(util.billingSummary(request),/215,00/)
 await api.createBillingCheckout(request,attempt,'qa@example.invalid','https://preview.example')
 const checkout=seen.checkout[0][0]
 assert.equal(checkout.mode,'payment');assert.equal(checkout.line_items.length,4);assert.match(checkout.line_items[0].price_data.product_data.name,/Ana/);assert.match(checkout.line_items[3].price_data.product_data.name,/Berta/)
 assert.equal(checkout.line_items.reduce((n,i)=>n+i.price_data.unit_amount,0),15250)
 const session={id:attempt.session_id,livemode:false,customer:'cus_qa',metadata:{billing_attempt_id:attempt.id},mode:'payment',status:'complete',payment_status:'paid',currency:'eur',amount_total:15250,payment_intent:'pi_qa'}
 await api.fulfillBillingCheckout(session,'checkout.session.completed')
 assert.equal(seen.collections[0].amount_input,15250);assert.equal(seen.schedules.length,1)
 const schedule=seen.schedules[0][0]
 assert.equal(schedule.start_date,Date.parse('2090-02-01T12:00:00Z')/1000);assert.equal(schedule.end_behavior,'cancel');assert.equal(schedule.phases.length,2)
 assert.deepEqual(schedule.phases.map(p=>p.items[0].price),['price_7500','price_21500']);assert.ok(schedule.phases.every(p=>p.duration.interval_count===1&&p.proration_behavior==='none'&&!p.add_invoice_items))
 await api.fulfillBillingCheckout(session,'checkout.session.completed');assert.equal(seen.schedules.length,1)
 stripe.invoices.listLineItems=async()=>({data:[{pricing:{price_details:{price:'price_21500'}},amount:21500,period:{start:Date.parse('2090-03-01T12:00:00Z')/1000}}]})
 const invoice={id:'in_march',status:'paid',currency:'eur',livemode:false,billing_reason:'subscription_cycle',amount_paid:21500,parent:{subscription_details:{subscription:'sub_qa'}}}
 await api.fulfillBillingInvoice(invoice);assert.equal(seen.collections.at(-1).amount_input,21500);assert.equal(seen.collections.at(-1).due_input,'2090-03-01')
 prices.get('price_21500').metadata.billing_attempt_id='other';await assert.rejects(()=>api.fulfillBillingInvoice(invoice));prices.get('price_21500').metadata.billing_attempt_id=attempt.id
 await assert.rejects(()=>api.fulfillBillingInvoice({...invoice,amount_paid:7500}))
 // Final-month family checkout has no future card authorization or subscription.
 request.billing_request_items=request.billing_request_items.filter(i=>i.phase==='initial');request.total_cents=15250;attempt.schedule_id=null;saveUsage=null
 await api.createBillingCheckout(request,attempt,'qa@example.invalid','https://preview.example');assert.equal(seen.checkout.at(-1)[0].payment_intent_data.setup_future_usage,undefined)
 await api.fulfillBillingCheckout(session,'checkout.session.completed');assert.equal(seen.schedules.length,1)
 // Existing cash family: save the card without charging an initial amount.
 request.billing_request_items=[item('8','a','Ana',7500,'2090-02-01','recurring','Febrero'),item('9','a','Ana',7500,'2090-03-01','recurring','Marzo'),item('10','b','Berta',14000,'2090-03-01','recurring','Marzo')]
 request.total_cents=29000;request.state='processing';attempt.state='open';attempt.schedule_id=null
 assert.match(util.billingSummary(request),/sin cargo ahora/)
 const collectedBefore=seen.collections.length
 await api.createBillingCheckout(request,attempt,'qa@example.invalid','https://preview.example')
 assert.equal(seen.checkout.at(-1)[0].mode,'setup');assert.equal(seen.checkout.at(-1)[0].line_items,undefined)
 await api.fulfillBillingCheckout({...session,mode:'setup',setup_intent:'seti_qa',payment_status:'no_payment_required'},'checkout.session.completed')
 assert.equal(seen.collections.length,collectedBefore,'Card setup must not mark any receipt paid')
 assert.equal(seen.schedules.length,2)
 assert.deepEqual(seen.schedules.at(-1)[0].phases.map(p=>p.items[0].price),['price_7500','price_21500'])
 assert.equal(seen.schedules.at(-1)[0].end_behavior,'cancel')
 console.log('PASS family Stripe (mock): one initial checkout with per-child lines; staggered months 75 then 215; no repeated fees; one schedule; invoice binding; retries; final month. No provider calls.')
})().catch(e=>{console.error(e);process.exitCode=1})
