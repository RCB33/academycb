const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Stripe = require('stripe')
let calls = 0, databaseFails = false, databaseCode = null
function load(file) {
    const result = { exports: {} }
    function localRequire(name) {
        if (name === 'server-only') return {}
        if (name === '@/lib/supabase/admin') return { createAdminClient: () => ({ rpc: async () => { calls++; return { error: databaseFails ? { message: 'test failure',code:databaseCode } : null } } }) }
        if (name.startsWith('@/')) return load(path.resolve('src', name.slice(2) + '.ts'))
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'))
        return require(name)
    }
    new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(result,result.exports,localRequire)
    return result.exports
}
process.env.VERCEL_ENV = 'preview'
process.env.STRIPE_SECRET_KEY = 'sk_test_unit_only'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit_only'
const { POST } = load(path.resolve('src/app/api/stripe/webhook/route.ts'))
const stripe = new Stripe('sk_test_unit_only')
const event = { id:'evt_unittest',livemode:false,type:'checkout.session.completed', data:{object:{id:'cs_test_unit',livemode:false,amount_total:100,currency:'eur',payment_status:'paid',metadata:{purpose:'academy_connection_test',academy_attempt_id:'11111111-1111-4111-8111-111111111111'}}} }
function request(value, signed = true) {
    const payload = JSON.stringify(value)
    return new Request('https://example.com/api/stripe/webhook', { method:'POST', body:payload, headers:signed ? { 'stripe-signature':stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET}) } : {} })
}
;(async () => {
    assert.equal((await POST(request(event,false))).status,400)
    assert.equal((await POST(new Request('https://example.com', {method:'POST',body:'{}',headers:{'stripe-signature':'bad'}}))).status,400)
    assert.equal(calls,0)
    assert.equal((await POST(request(event))).status,200)
    assert.equal(calls,1)
    databaseFails=true
    assert.equal((await POST(request(event))).status,500)
    databaseCode='P0002'
    assert.equal((await POST(request(event))).status,500,'A missing paid record must still retry')
    assert.equal((await POST(request({...event,type:'checkout.session.expired'}))).status,200,'An expired deleted fixture has no financial action')
    databaseCode=null
    databaseFails=false
    assert.equal((await POST(request(event))).status,200)
    const before=calls
    assert.equal((await POST(request({...event,type:'customer.created'}))).status,200)
    assert.equal((await POST(request({...event,livemode:true}))).status,400)
    assert.equal((await POST(request({...event,data:{object:{...event.data.object,metadata:{purpose:'unrelated'}}}}))).status,200)
    assert.equal(calls,before)
    assert.equal((await POST(request({...event,data:{object:{...event.data.object,metadata:{purpose:'academy_connection_test'}}}}))).status,422)
    assert.equal((await POST(new Request('https://example.com',{method:'POST',body:'x'.repeat(1_000_001),headers:{'stripe-signature':'bad'}}))).status,413)
    delete process.env.STRIPE_WEBHOOK_SECRET
    assert.equal((await POST(request(event,false))).status,503)
    console.log('PASS: real signature verification, malformed/missing signature, test/live guard, payload limit, ignored unrelated events, retry after DB error, missing configuration. No network or charges.')
})().catch(() => { console.error('FAIL: webhook unit tests'); process.exitCode=1 })
