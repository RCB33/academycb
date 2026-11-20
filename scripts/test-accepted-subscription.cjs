const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
let choice = 'monthly_card', receipts = [{ id: 'future-month' }], calls = [], rpcError = null, filters = []
const requestId = '30000000-0000-4000-8000-000000000001'
const details = () => ({ plan: { name: 'Academia' }, groups: [], start_date: '2027-01-15', payment_choice: choice, accepted: { membership_id: 'membership', first_month: 37.5, enrollment_fee: 30, plus: 0 }, quote: { remaining: [1], monthly_price: 75, percent: 50, season_end: '2027-02-28' } })
const db = {
  from() {
    const q = {
      select: () => q, eq: (field, value) => { filters.push([field, value]); return q }, gt: (field, value) => { filters.push([field, value]); return q }, in: () => q, order: () => q,
      single: async () => ({ data: { academy_details: details() } }),
      then: (resolve, reject) => Promise.resolve({ data: receipts, error: null }).then(resolve, reject),
    }; return q
  },
  rpc: async (name, args) => { calls.push({ name, args }); return { data: requestId, error: rpcError } },
}
function load(file) {
  const m = { exports: {} }
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => {
    if (name === 'server-only' || name === '@/lib/registration-email') return {}
    if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
    if (name === '@/lib/stripe-payments') return { configuredStripe: () => ({ mode: 'live' }) }
    return require(name)
  }); return m.exports
}
;(async () => {
  const { prepareAcceptedSubscription: prepare } = load('src/lib/enrollment-onboarding.ts')
  const args = [requestId, 'admin', 'child', 'guardian']
  process.env.STRIPE_RECURRING_PAYMENTS_ENABLED = 'false'
  assert.equal((await prepare(...args)).status, 'pending_activation'); assert.equal(calls.length, 0)
  process.env.STRIPE_RECURRING_PAYMENTS_ENABLED = 'true'
  const ready = await prepare(...args)
  assert.deepEqual(ready, { status: 'ready', requestId, combined: true })
  assert.equal(calls[0].name, 'create_enrollment_billing_request')
  assert.equal(calls[0].args.request_input, requestId)
  assert.equal(calls[0].args.mode_input, 'live')
  assert.equal(calls[0].args.guardian_input, 'guardian')
  assert.equal(calls[0].args.actor_input, 'admin')
  choice = 'cash'; calls = []
  assert.equal((await prepare(...args)).status, 'cash'); assert.equal(calls.length, 0)
  choice = 'monthly_card'; receipts = []
  assert.equal((await prepare(...args)).status, 'ready'); assert.equal(calls.length, 1, 'Last month still receives its initial payment link')
  receipts = [{ id: 'future-month' }]; rpcError = { message: 'Invalid guardian or receipt' }
  const failed = await prepare(...args)
  assert(failed.error); assert.equal(failed.requestId, undefined, 'Never email an unprepared payment link')
  console.log('PASS: enabled LIVE preparation, disabled/cash exclusions, last-month initial checkout, exact enrollment/guardian/actor, failed preparation without link. No provider calls or real payments.')
})().catch(error => { console.error(error); process.exitCode = 1 })
