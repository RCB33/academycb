const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const purpose = 'academy_webhook_delivery_probe_v1'
let session, creates = 0, expires = 0, updates = 0, allowed = true, expireFails = false, updateFails = false
const stripe = { checkout: { sessions: {
 create: async (params, options) => {
  creates++
  assert.equal(params.customer_creation, 'if_required')
  assert.equal(params.line_items[0].price_data.unit_amount,100)
  assert.ok(options.idempotencyKey.startsWith('academy-webhook-probe-live-'))
  assert.equal(params.payment_intent_data,undefined)
  if (!session) session={id:'cs_live_probe123', livemode:true, mode:'payment',amount_total:100,currency:'eur',payment_status:'unpaid',status:'open',customer:null,subscription:null,metadata:params.metadata,url:'https://checkout.stripe.com/NEVER_EXPOSE'}
  return {...session,status:'open'}
 },
 retrieve: async () => structuredClone(session),
 list: async () => ({data:session?[structuredClone(session)]:[]}),
 expire: async () => { expires++; if(expireFails) throw Error('timeout'); session.status='expired';return structuredClone(session) },
 update: async (id,params) => { updates++;assert.equal(id,session.id); if(updateFails)throw Error('temporary'); Object.assign(session.metadata,params.metadata);return structuredClone(session) },
} } }
const cache = new Map()
function load(file) {
 if(cache.has(file))return cache.get(file)
 const result={exports:{}}
 function localRequire(name){
  if(name==='server-only')return {}
  if(name==='./stripe-payments')return {configuredStripe:()=>({mode:'live',stripe})}
  if(name==='@/lib/auth')return {requireAdmin:async()=>{if(!allowed)throw Error('denied');return {user:{id:'11111111-1111-4111-8111-111111111111'}}}}
  if(name.startsWith('@/'))return load(path.resolve('src',name.slice(2)+'.ts'))
  if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name+'.ts'))
  return require(name)
 }
 new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(result,result.exports,localRequire)
 cache.set(file,result.exports);return result.exports
}
const lib=load(path.resolve('src/lib/stripe-webhook-probe.ts'))
const route=load(path.resolve('src/app/api/admin/stripe/webhook-probe/route.ts'))
const req=(origin='https://www.academycostabrava.com')=>new Request('https://www.academycostabrava.com/api/admin/stripe/webhook-probe',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'})
;(async()=>{
 assert.equal(await lib.readWebhookProbe(),null)
 assert.equal((await route.POST(req('https://evil.example'))).status,403)
 allowed=false
 assert.equal((await route.POST(req())).status,403)
 assert.equal((await route.GET(new Request('https://www.academycostabrava.com/api/admin/stripe/webhook-probe'))).status,403)
 assert.equal(creates,0)
 allowed=true
 const start=await route.POST(req());assert.equal(start.status,200)
 const body=await start.json();assert.equal(body.probe.expired,true);assert.equal(body.probe.verified,false)
 assert.ok(!JSON.stringify(body).includes('NEVER_EXPOSE'))
 await lib.startWebhookProbe('11111111-1111-4111-8111-111111111111');assert.equal(expires,1,'Repeated call reuses expired session')
 const event={id:'evt_probe',type:'checkout.session.expired',data:{object:structuredClone(session)}}
 await assert.rejects(()=>lib.recordWebhookProbe({...event,type:'checkout.session.completed'}))
 await assert.rejects(()=>lib.recordWebhookProbe({...event,data:{object:{...session,payment_status:'paid'}}}))
 await assert.rejects(()=>lib.recordWebhookProbe({...event,data:{object:{...session,metadata:{purpose:'academy_receipt'}}}}))
 assert.equal(updates,0)
 updateFails=true;await assert.rejects(()=>lib.recordWebhookProbe(event));updateFails=false
 await lib.recordWebhookProbe(event)
 const verified=await lib.readWebhookProbe(session.id);assert.equal(verified.verified,true);assert.equal(verified.eventId,'evt_probe')
 const before=updates;await lib.recordWebhookProbe(event);assert.equal(updates,before,'Duplicate is idempotent')
 await assert.rejects(()=>lib.readWebhookProbe('cs_test_/../../secret'))
 session=null;expireFails=true
 const failure=await route.POST(req());assert.equal(failure.status,502)
 assert.ok(!(await failure.text()).includes('timeout'))
 console.log('PASS: admin-only and same-origin probe, no checkout URL exposure, immediate expiry, idempotency, signed receipt recording, retry after failure, no financial database calls. Mock Stripe only.')
})().catch(e=>{console.error(e);process.exitCode=1})
