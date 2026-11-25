const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const loaded = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/tournament-pricing.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(loaded, loaded.exports)
const { tournamentPricing, getTournamentPricing } = loaded.exports
const sum = values => values.reduce((total, value) => total + value, 0)
for (const [id, plan] of Object.entries(tournamentPricing)) {
    assert.equal(sum(plan.monthlyCents), plan.totalCents, 'Monthly payments preserve the agreed total')
    assert.equal(plan.twoPaymentsCents.length, 2)
    assert.equal(getTournamentPricing(id, plan.totalCents / 100), plan)
    assert.equal(getTournamentPricing(id, plan.totalCents / 100 + 1), null, 'Hide stale offers after an admin changes the total')
    assert.equal(getTournamentPricing(id, 0), null)
    assert.equal(getTournamentPricing(id, 'invalid'), null)
}
const donosti = tournamentPricing['9b6c8ac0-a542-49ab-a116-6679c8640932']
assert.deepEqual(donosti.monthlyCents, [15000, 15000, 15000, 15000, 15000, 15000, 12500])
assert.equal(sum(donosti.twoPaymentsCents), 102500)
const pirineos = tournamentPricing['c93d7e14-a316-4dab-b240-a6e4b3d0ee81']
assert.deepEqual(pirineos.monthlyCents, [10000, 10000, 10000, 10000, 10000, 9900])
assert.equal(sum(pirineos.twoPaymentsCents), 59900)
const artena = tournamentPricing['15f0483d-26a8-450e-a6a8-8f7a7c957277']
assert.equal(artena.totalCents - sum(artena.twoPaymentsCents), 2000)
assert.equal(getTournamentPricing('unrelated-event', 599), null)
console.log('Tournament prices: approved totals, final instalments, Artena discount and stale-price protection passed')
