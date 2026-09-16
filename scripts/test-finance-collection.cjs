const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
let authorized = true, calls = [], result = { data: [{ id: 'receipt' }], error: null }
function from(table) {
    const query = { then(resolve, reject) { return Promise.resolve(table === 'academy_settings' ? { data: { value: 'true' }, error: null } : result).then(resolve, reject) } }
    for (const method of ['select', 'eq', 'in', 'is', 'order', 'maybeSingle', 'single', 'update', 'insert']) query[method] = (...args) => { calls.push({ table, method, args }); return query }
    return query
}
const moduleResult = { exports: {} }
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('src/app/actions/finance.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(moduleResult, moduleResult.exports, name => {
    if (name === 'next/cache') return { revalidatePath() {} }
    if (name === '@/lib/auth') return { requireFinanceAccess: async () => { if (!authorized) throw Error('Forbidden'); return { supabase: { from } } }, requireAdmin: async () => { throw Error('Not used') } }
    return require(name)
})
const { collectExistingReceipt, recordManualPayment, setPaymentStatus } = moduleResult.exports
const input = { id: '11111111-1111-4111-8111-111111111111', version: '2026-09-16T08:00:00+00:00', date: '2026-09-14', method: 'transfer' }
;(async () => {
    assert.equal((await collectExistingReceipt(input)).success, true)
    const update = calls.find(c => c.method === 'update').args[0]
    assert.equal(update.paid_at, '2026-09-14T12:00:00.000Z')
    assert.equal(update.method, 'transfer')
    for (const protectedField of ['amount', 'child_id', 'ref_id', 'due_date']) assert.equal(protectedField in update, false)
    assert.equal(calls.some(c => c.method === 'insert'), false)
    assert(calls.some(c => c.method === 'eq' && c.args[0] === 'updated_at' && c.args[1] === input.version))
    assert(calls.some(c => c.method === 'in' && c.args[0] === 'status' && c.args[1].join() === 'pending,failed'))
    for (const key of ['stripe_payment_intent_id', 'stripe_invoice_id']) assert(calls.some(c => c.method === 'is' && c.args[0] === key && c.args[1] === null))
    result = { data: [], error: null }
    assert.equal((await collectExistingReceipt(input)).success, false, 'stale/double click must not report success')
    result = { data: null, error: { message: 'Checkout in progress' } }
    assert.equal((await collectExistingReceipt(input)).success, false)
    calls = []
    assert.equal((await collectExistingReceipt({ ...input, method: 'stripe' })).success, false)
    assert.equal(calls.length, 0)
    assert.equal((await setPaymentStatus(input.id, 'paid')).success, false, 'old one-click paid path disabled')
    assert.equal((await recordManualPayment({ amount: 50, type: 'academy', method: 'cash', description: 'Extra', date: input.date })).success, false)
    assert.equal(calls.some(c => c.method === 'insert'), false)
    authorized = false
    await assert.rejects(() => collectExistingReceipt(input), /Forbidden/)
    console.log('PASS: existing receipt only, immutable amount/player/due date, date/method, CAS double-click guard, Stripe bindings, permission checks and independent income confirmation. No network or data writes.')
})().catch(error => { console.error(error); process.exitCode = 1 })
