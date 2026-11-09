const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(file) {
    const result = { exports: {} }
    const localRequire = name => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name)
    new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText)(result, result.exports, localRequire)
    return result.exports
}
const { AcademyCheckoutSchema, academyPriceSnapshot } = load(path.resolve('src/lib/academy-pricing.ts'))
const plan = { id: 'example', name: 'Academia temporada', is_active: true, duration_months: 9,
    full_payment_enabled: true, full_payment_price: 600, monthly_payment_enabled: true, monthly_payment_price: 75, enrollment_fee: 25 }
const full = academyPriceSnapshot(plan, 'full')
assert.equal(full.totalAmountCents, 62500)
assert.equal(full.installments, 1)
const monthly = academyPriceSnapshot(plan, 'monthly')
assert.equal(monthly.totalAmountCents, 70000)
assert.equal(monthly.firstPaymentCents, 10000)
assert.equal(monthly.installments, 9)
assert.equal(monthly.autoRenew, false)
assert(Object.isFrozen(monthly))
assert.equal(academyPriceSnapshot({ ...plan, duration_months: 1, enrollment_fee: 0 }, 'monthly').totalAmountCents, 7500)
assert.equal(academyPriceSnapshot({ ...plan, duration_months: 60 }, 'monthly').installments, 60)
for (const change of [
    { duration_months: 0 }, { duration_months: 61 }, { duration_months: 2.5 },
    { monthly_payment_price: null }, { monthly_payment_price: -1 },
    { monthly_payment_price: 10.001 }, { monthly_payment_price: Infinity },
    { full_payment_price: null },
]) assert.equal(AcademyCheckoutSchema.safeParse({ ...plan, ...change }).success, false)
assert.throws(() => academyPriceSnapshot({ ...plan, monthly_payment_enabled: false }, 'monthly'))
assert.throws(() => academyPriceSnapshot({ ...plan, is_active: false }, 'full'))
assert.throws(() => academyPriceSnapshot(plan, 'untrusted'))
assert.throws(() => academyPriceSnapshot({ ...plan, monthly_payment_price: 1_000_000 }, 'monthly'))
plan.monthly_payment_price = 90
plan.duration_months = 12
assert.equal(monthly.unitAmountCents, 7500)
assert.equal(monthly.installments, 9)
assert.equal(academyPriceSnapshot(plan, 'monthly').unitAmountCents, 9000)
assert.equal(AcademyCheckoutSchema.parse({ duration_months: 9 }).monthly_payment_enabled, false)
console.log('PASS: full/monthly choices, one-time enrollment fee, finite duration, archived/disabled rejection, decimal validation, immutable price snapshot. No charges.')
