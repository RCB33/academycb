const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(file, mocks = {}) {
    const m = { exports: {} }
    new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => mocks[name] || require(name))
    return m.exports
}
const { monthlyCardCandidates } = load('src/lib/parent-monthly-card.ts')
const membership = { id: 'm', child_id: 'child', status: 'active', plan_snapshot: { frequency: 'mensual' } }
const payment = { id: 'p', ref_id: 'm', type: 'academy', concept_code: 'monthly', status: 'pending', due_date: '2026-12-01' }
const request = { mode: 'live', state: 'ready', expires_at: '2026-12-01', billing_request_items: [{ payment_id: 'p' }] }
const candidates = (m = [membership], p = [payment], r = [], c = []) => monthlyCardCandidates(m,p,r,c,'live','2026-11-24',Date.parse('2026-11-24'))
assert.equal(candidates().length,1)
assert.equal(candidates([], [payment]).length,0)
assert.equal(candidates([{...membership,status:'cancelled'}]).length,0)
assert.equal(candidates([{...membership,plan_snapshot:{frequency:'anual'}}]).length,0)
assert.equal(candidates(undefined,[{...payment,status:'paid'}]).length,0)
assert.equal(candidates(undefined,[{...payment,due_date:'2026-11-01'}]).length,0)
assert.equal(candidates(undefined,undefined,[request]).length,0)
assert.equal(candidates(undefined,undefined,[{...request,expires_at:'2026-11-01'}]).length,1)
assert.equal(candidates(undefined,undefined,[{...request,expires_at:'2026-11-01',state:'active'}]).length,0)
assert.equal(candidates(undefined,undefined,[{...request,mode:'test'}]).length,1)
assert.equal(candidates(undefined,undefined,[],[{membership_id:'m',mode:'live',state:'active'}]).length,0)
assert.equal(candidates(undefined,undefined,[],[{membership_id:'m',mode:'test',state:'active'}]).length,1)

let authorized = true, verified = true, mode = 'live', dbError = null, data = {requestId:'22222222-2222-4222-8222-222222222222'}, calls = []
const route = load('src/app/api/billing/monthly/route.ts', {
    '@/lib/auth': { requireRole: async roles => { assert.deepEqual(roles,['guardian']); if(!authorized)throw Error('denied'); return {user:{id:'verified-session-user',email_confirmed_at:verified?'2026-11-01':null}} } },
    '@/lib/stripe-availability': { stripeCheckoutMode: async () => mode },
    '@/lib/supabase/admin': { createAdminClient: () => ({rpc: async (name,args) => { calls.push([name,args]); return { data, error:dbError } }}) },
})
const origin='https://www.academycostabrava.com'
const guardianId='11111111-1111-4111-8111-111111111111'
const post=(o=origin,body={guardianId,owner_input:'forged-user',mode:'test',amount:1})=>new Request(origin+'/api/billing/monthly',{method:'POST',headers:{origin:o},body:JSON.stringify(body)})
;(async()=>{
 process.env.STRIPE_RECURRING_PAYMENTS_ENABLED='true'
 assert.equal((await route.POST(post('https://other.example'))).status,403)
 authorized=false;assert.equal((await route.POST(post())).status,403);authorized=true
 verified=false;assert.equal((await route.POST(post())).status,403);verified=true
 assert.equal((await route.POST(post(origin,{guardianId:'bad'}))).status,400)
 mode=null;assert.equal((await route.POST(post())).status,409)
 mode='live';process.env.STRIPE_RECURRING_PAYMENTS_ENABLED='false';assert.equal((await route.POST(post())).status,409)
 assert.equal(calls.length,0)
 process.env.STRIPE_RECURRING_PAYMENTS_ENABLED='true'
 const response=await route.POST(post());assert.equal(response.status,200)
 assert.deepEqual(await response.json(),{url:'/portal/pagos/solicitud/'+data.requestId})
 assert.deepEqual(calls[0],['prepare_parent_monthly_billing',{owner_input:'verified-session-user',guardian_input:guardianId,mode_input:'live'}])
 data={status:'no_future_dues'};assert.equal((await route.POST(post())).status,409)
 dbError={message:'private SQL details'};const failed=await route.POST(post());assert.equal(failed.status,409);assert.ok(!(await failed.text()).includes('private SQL'))
 console.log('PASS: eligibility, paid/overdue exclusions, existing/live/test authorizations, authenticated guardian only, origin, verified email, feature gate, trusted identity/mode and review redirect. No Stripe calls or database writes.')
})().catch(e=>{console.error(e);process.exitCode=1})
