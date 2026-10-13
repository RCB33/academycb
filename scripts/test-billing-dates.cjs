const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const m = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/membership-billing.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m, m.exports)
const { billingDueDate, addBillingMonths } = m.exports
const quarterly = m.exports.buildMonthlyCharges(new Date('2026-01-31T12:00:00Z'), 6, 3, 100, 5)
assert.deepEqual(quarterly.map(r => r.covered_month), ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'])
assert.equal(quarterly.reduce((n,r) => n + Math.round(r.amount * 100), 0), 20000)
assert.deepEqual(quarterly.slice(0,3).map(r => r.amount), [33.34,33.33,33.33])
assert.ok(quarterly.slice(0,3).every(r => r.due_date === '2026-01-31'))
assert.ok(quarterly.slice(3).every(r => r.due_date === '2026-04-05'))
for (const day of [29, 30, 31]) {
  const start = new Date(`2026-01-${day}T12:00:00Z`)
  assert.deepEqual([0, 1, 2].map(i => billingDueDate(start, i, 5)), [`2026-01-${day}`, '2026-02-05', '2026-03-05'])
}
assert.equal(addBillingMonths(new Date('2024-01-31T12:00:00Z'), 1).toISOString().slice(0, 10), '2024-02-29')
assert.equal(addBillingMonths(new Date('2024-02-29T12:00:00Z'), 12).toISOString().slice(0, 10), '2025-02-28')
assert.equal(billingDueDate(new Date('2026-11-30T12:00:00Z'), 3, 5), '2027-02-05')
assert.equal(billingDueDate(new Date('2026-01-02T12:00:00Z'), 0, 5), '2026-01-05')
console.log('PASS: billing month ends, leap years, quarterly periods, year boundaries and first due date')
