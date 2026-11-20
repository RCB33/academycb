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
 await api.createBillingCheckout(request,attempt,'qa@example.invalid','https://preview.example')
 assert.equal(seen.checkout[0][0].mode,'setup');assert.match(seen.checkout[0][0].custom_text.submit.message,/Sin renovación/)
 assert.equal(seen.collections.length,0)
 const session={id:attempt.session_id,livemode:false,customer:'cus_qa',setup_intent:'seti_qa',metadata:{billing_attempt_id:attempt.id}}
 customer='cus_other';await assert.rejects(()=>api.fulfillBillingCheckout(session,'checkout.session.completed'));assert.equal(seen.schedules.length,0);customer='cus_qa'
 await api.fulfillBillingCheckout(session,'checkout.session.completed')
 const schedule=seen.schedules[0][0]
 assert.equal(schedule.start_date,Date.parse('2090-01-05T12:00:00Z')/1000)
 assert.equal(schedule.end_behavior,'cancel');assert.deepEqual(schedule.phases[0].duration,{interval:'month',interval_count:2});assert.equal(schedule.phases[0].proration_behavior,'none')
 assert.equal(attempt.state,'active');assert.equal(attempt.billing_status,'scheduled');assert.equal(seen.collections.length,0,'Setup must not create income')
 await api.fulfillBillingCheckout(session,'checkout.session.completed');assert.equal(seen.schedules.length,1)
 const invoice={id:'in_qa',status:'paid',currency:'eur',livemode:false,billing_reason:'subscription_create',amount_paid:6000,parent:{subscription_details:{subscription:'sub_qa'}}}
 await api.fulfillBillingInvoice(invoice);assert.equal(seen.collections[0].due_input,'2090-01-05');assert.equal(seen.collections[0].amount_input,6000)
 const count=seen.collections.length;status='past_due';await api.syncBillingSubscription('sub_qa');assert.equal(attempt.billing_status,'attention');assert.equal(seen.collections.length,count)
 status='active';latestInvoice={status:'open',attempt_count:1};await api.syncBillingSubscription('sub_qa');assert.equal(attempt.billing_status,'attention');latestInvoice={status:'paid',attempt_count:1};await api.syncBillingSubscription('sub_qa');assert.equal(attempt.billing_status,'active');
 status='canceled';await api.syncBillingSubscription('sub_qa');assert.equal(attempt.billing_status,'ended')
 await assert.rejects(()=>api.fulfillBillingInvoice({...invoice,status:'open'}));await assert.rejects(()=>api.fulfillBillingInvoice({...invoice,livemode:true}));await assert.rejects(()=>api.fulfillBillingInvoice({...invoice,amount_paid:1}))
 failure=true;await assert.rejects(()=>api.fulfillBillingInvoice(invoice));failure=false
 request.kind='payment';request.state='processing';attempt.schedule_id=null
 await api.createBillingCheckout(request,attempt,'qa@example.invalid','https://preview.example');assert.equal(seen.checkout.at(-1)[0].line_items[0].price_data.unit_amount,12000)
 await api.fulfillBillingCheckout({...session,payment_status:'unpaid'},'checkout.session.completed');assert.equal(seen.collections.length,count+1)
 await api.fulfillBillingCheckout({...session,payment_status:'paid',amount_total:12000,currency:'eur'},'checkout.session.completed');assert.equal(seen.collections.at(-1).collection_input,attempt.session_id)
 request.kind='subscription';request.state='processing';attempt.state='open';attempt.schedule_id=null;attempt.subscription_id=null
 const future=request.billing_request_items.map(i=>({...i,phase:'recurring'}))
 const initial=[{position:-3,phase:'initial',amount_cents:3750,due_date:'2089-12-16',snapshot:{description:'Primer mes'}},{position:-2,phase:'initial',amount_cents:3000,due_date:'2089-12-16',snapshot:{description:'Matrícula'}},{position:-1,phase:'initial',amount_cents:5000,due_date:'2089-12-16',snapshot:{description:'Plus'}}]
 request.billing_request_items=[...initial,...future];request.total_cents=23750
 await api.createBillingCheckout(request,attempt,'qa@example.invalid','https://preview.example')
 const checkout=seen.checkout.at(-1)[0];assert.equal(checkout.mode,'payment');assert.equal(checkout.customer,'cus_qa');assert.equal(checkout.payment_intent_data.setup_future_usage,'off_session');assert.deepEqual(checkout.line_items.map(i=>i.price_data.unit_amount),[3750,3000,5000]);assert.match(checkout.custom_text.submit.message,/117,50/);assert.match(checkout.custom_text.submit.message,/60,00/)
 const paid={...session,mode:'payment',status:'complete',payment_status:'paid',currency:'eur',amount_total:11750,payment_intent:'pi_qa'}
 const before=seen.schedules.length,collections=seen.collections.length
 await api.fulfillBillingCheckout({...paid,payment_status:'unpaid'},'checkout.session.completed');assert.equal(seen.collections.length,collections)
 await assert.rejects(()=>api.fulfillBillingCheckout({...paid,amount_total:23750},'checkout.session.completed'))
 customer='wrong';await assert.rejects(()=>api.fulfillBillingCheckout(paid,'checkout.session.completed'));customer='cus_qa'
 paymentStatus='requires_action';await assert.rejects(()=>api.fulfillBillingCheckout(paid,'checkout.session.completed'));paymentStatus='succeeded'
 saveUsage=null;await assert.rejects(()=>api.fulfillBillingCheckout(paid,'checkout.session.completed'));saveUsage='off_session'
 received=1;await assert.rejects(()=>api.fulfillBillingCheckout(paid,'checkout.session.completed'));received=11750
 failure=true;await assert.rejects(()=>api.fulfillBillingCheckout(paid,'checkout.session.completed'));failure=false;assert.equal(seen.schedules.length,before,'Never schedule if initial collection fails')
 await api.fulfillBillingCheckout(paid,'checkout.session.completed');assert.equal(seen.collections.at(-1).amount_input,11750);assert.equal(seen.schedules.length,before+1)
 const combinedSchedule=seen.schedules.at(-1)[0];assert.equal(combinedSchedule.start_date,Date.parse('2090-01-05T12:00:00Z')/1000);assert.equal(combinedSchedule.phases[0].duration.interval_count,2);assert.equal(combinedSchedule.phases[0].add_invoice_items,undefined,'No repeated fee or Plus');assert.equal(combinedSchedule.end_behavior,'cancel')
 await api.fulfillBillingCheckout(paid,'checkout.session.completed');assert.equal(seen.schedules.length,before+1,'Webhook retry never creates another schedule')
 attempt.schedule_id=null;request.billing_request_items=initial;request.total_cents=11750
 await api.createBillingCheckout(request,attempt,'qa@example.invalid','https://preview.example');assert.equal(seen.checkout.at(-1)[0].payment_intent_data.setup_future_usage,undefined,'Final month does not save card for unnecessary future charges')
 saveUsage=null;await api.fulfillBillingCheckout(paid,'checkout.session.completed');assert.equal(seen.schedules.length,before+1,'Final month is one payment only')
 const util=load(path.resolve('src/lib/billing-request.ts'));assert.equal(util.billingReturnPath('//evil.com'),null);assert.equal(util.billingReturnPath('/\\evil.com'),null);assert.equal(util.billingReturnPath('/portal/pagos/solicitud/'+request.id),'/portal/pagos/solicitud/'+request.id)
 console.log('PASS: consent setup, preserved amounts/dates, finite schedule, authorization is not income, invoice-date mapping, failed/end states, wrong owner/mode/amount rejection, retry, payment total and safe login return. Combined initial line items, saved card consent, exact first amount, final month, future-only schedule. Mock Stripe, no network.')
})().catch(e=>{console.error(e);process.exitCode=1})
