const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(file, dependencies = {}) {
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  new Function('module', 'exports', 'require', source)(module, module.exports, name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
    return dependencies[name]
  })
  return module.exports
}
const { playerPaymentSummary: summary } = load('src/lib/player-payment-summary.ts', {
  './receipt-balance': load('src/lib/receipt-balance.ts'),
})
const receipt = (status, amount = 80, allocations) => ({ status, amount, manual_receipt_allocations: allocations })
const allocation = (amount, voided_at = null) => ({ amount, voided_at, method: 'cash', paid_date: '2026-11-21' })
assert.equal(summary([]).label, 'Sin recibos creados')
assert.equal(summary([]).tone, 'neutral')
assert.equal(summary([receipt('cancelled'), receipt('refunded')]).label, 'Sin recibos activos')
for (const status of ['pending', 'overdue', 'failed']) {
  const result = summary([receipt(status)])
  assert.equal(result.label, 'Pendiente de cobro')
  assert.equal(result.remaining, 80)
  assert.equal(result.paid, 0)
}
assert.equal(summary([receipt('paid', 0)]).tone, 'neutral')
assert.equal(summary([receipt('paid')]).label, 'Cobros registrados')
assert.equal(summary([receipt('paid')]).paid, 80)
for (const status of ['pending', 'paid']) {
  const result = summary([receipt(status, 80, [allocation(20), allocation(30, '2026-11-21')])])
  assert.equal(result.label, 'Cobro parcial')
  assert.equal(result.paid, 20)
  assert.equal(result.remaining, 60)
}
assert.equal(summary([receipt('paid', 80, [allocation(80, '2026-11-21')])]).label, 'Pendiente de cobro')
assert.equal(summary([receipt('pending', 0.3, [allocation(0.1), allocation(0.2)])]).remaining, 0)
const mixed = summary([receipt('paid', 50), receipt('failed', 30), receipt('refunded', 20)])
assert.equal(mixed.paid, 50)
assert.equal(mixed.remaining, 30)
assert.equal(mixed.label, 'Cobro parcial')
for (const row of [receipt('unknown'), receipt('paid', null), receipt('paid', -1), receipt('paid', 'bad'), receipt('paid', 80, [allocation(-5)])]) {
  assert.equal(summary([row]).label, 'Revisar recibos')
}
assert.equal(summary([receipt('paid')], 'Error de consulta').label, 'No disponible')
assert.equal(summary([receipt('paid')], 'Error de consulta').tone, 'neutral')

async function run() {
  for (const failedTable of [null, 'academy_memberships', 'payments']) {
    const queries = []
    const supabase = { from(table) {
      const query = { select() { return query }, eq(column, value) { queries.push({ table, column, value }); return query },
        async order() { return failedTable === table ? { data: null, error: { message: 'private database error' } } : { data: table === 'payments' ? [receipt('paid')] : [], error: null } } }
      return query
    } }
    const { getStudentPayments } = load('src/app/actions/payments.ts', { '@/lib/auth': { requireFinanceAccess: async () => ({ supabase }) } })
    const result = await getStudentPayments('test-child')
    assert.equal(queries.length, 2)
    assert.ok(queries.every(q => q.column === 'child_id' && q.value === 'test-child'))
    assert.equal(Boolean(result.error), Boolean(failedTable))
    if (failedTable) {
      assert.equal(summary(result.payments, result.error).tone, 'neutral')
      assert.ok(!result.error.includes('private database error'))
    }
  }
  const { getStudentPayments } = load('src/app/actions/payments.ts', { '@/lib/auth': { requireFinanceAccess: async () => { throw new Error('Forbidden') } } })
  await assert.rejects(getStudentPayments('test-child'), /Forbidden/)
  console.log('PASS: truthful receipt summaries, partial/failed/voided payments, query errors and access guard (mock only)')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
