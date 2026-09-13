const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Stripe = require('stripe')
const moduleObject = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/payment-rules.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(moduleObject, moduleObject.exports)
const { eurosToCents, validatePaymentEnvironment, assertPaidSession } = moduleObject.exports
assert.equal(eurosToCents('75.10'), 7510)
assert.equal(eurosToCents(0.5), 50)
for (const value of [-1, NaN, Infinity, '1.001', '1e3', '0.00', '1,50', '999999999999999']) assert.throws(() => eurosToCents(value))
const config = { key: 'rk_test_dummy', deployment: 'preview', webhookSecret: 'whsec_dummy' }
assert.equal(validatePaymentEnvironment(config), 'test')
assert.throws(() => validatePaymentEnvironment({ ...config, deployment: 'production', liveEnabled: 'true' }))
assert.throws(() => validatePaymentEnvironment({ ...config, key: 'rk_live_dummy' }))
assert.throws(() => validatePaymentEnvironment({ ...config, webhookSecret: '' }))
assert.throws(() => validatePaymentEnvironment({ ...config, key: 'rk_live_dummy', deployment: 'production' }))
const expected = { sessionId: 'cs_test_1', attemptId: 'attempt1', amountCents: 7500, mode: 'test' }
const session = { id: 'cs_test_1', metadata: { academy_attempt_id: 'attempt1' }, livemode: false, payment_status: 'paid', amount_total: 7500, currency: 'eur' }
assert.equal(assertPaidSession(session, expected), true)
assert.equal(assertPaidSession({ ...session, payment_status: 'unpaid' }, expected), false)
for (const changed of [{ id: 'another' }, { metadata: {} }, { livemode: true }, { amount_total: 1 }, { currency: 'usd' }]) assert.throws(() => assertPaidSession({ ...session, ...changed }, expected))
const stripe = new Stripe('sk_test_dummy')
const payload = JSON.stringify({ id: 'evt_test', livemode: false, type: 'checkout.session.completed', data: { object: session } })
const secret = 'whsec_unit_test_only'
const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
assert.equal(stripe.webhooks.constructEvent(payload, header, secret).id, 'evt_test')
assert.throws(() => stripe.webhooks.constructEvent(payload + ' ', header, secret))
assert.throws(() => stripe.webhooks.constructEvent(payload, header, 'whsec_wrong'))
const expired = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: Math.floor(Date.now() / 1000) - 600 })
assert.throws(() => stripe.webhooks.constructEvent(payload, expired, secret, 300))
console.log('PASS: amounts, test/live isolation, disabled live payments, exact session/amount/currency binding, unpaid rejection, signed/tampered/expired webhooks. No network or charges.')
