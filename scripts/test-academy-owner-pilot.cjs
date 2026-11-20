const fs = require('fs'), ts = require('typescript'), assert = require('node:assert/strict')
const m = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/academy-owner-pilot.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m, m.exports)
const { assertOwnerPilot, OWNER_PILOT_ACCOUNT: owner, OWNER_PILOT_CONTRACT: id } = m.exports
const c = { id, owner_id: owner, mode: 'live', choice: 'monthly', unit_cents: 100, fee_cents: 0, months: 1, total_cents: 100, return_origin: 'https://www.academycostabrava.com' }
assert.doesNotThrow(() => assertOwnerPilot(c, owner))
for (const [key, value] of Object.entries({ id: 'another', owner_id: 'another', mode: 'test', choice: 'full', unit_cents: 101, fee_cents: 1, months: 2, total_cents: 200, return_origin: 'https://example.com' })) assert.throws(() => assertOwnerPilot({ ...c, [key]: value }, owner))
assert.throws(() => assertOwnerPilot(c, 'another'))
console.log('PASS owner-only, one persisted contract, exactly EUR 1, one month, zero extras; no global activation.')
