const fs = require('fs'), ts = require('typescript'), assert = require('node:assert/strict')
let actor = 'ac35ef1d-aab4-47fc-bb13-04d6d24046e0'
const m = { exports: {} }
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('src/app/api/admin/stripe/owner-pilot/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m, m.exports, name => {
    if (name === '@/lib/auth') return { requireAdmin: async () => { if (!actor) throw Error('denied'); return { user: { id: actor } } } }
    if (name === '@/lib/academy-owner-pilot') return { OWNER_PILOT_ACCOUNT: 'ac35ef1d-aab4-47fc-bb13-04d6d24046e0' }
    throw Error('Retired launcher must not access Stripe or the database: ' + name)
})
const origin = 'https://www.academycostabrava.com'
const request = (o = origin) => new Request(origin + '/api/admin/stripe/owner-pilot', { method: 'POST', headers: { origin: o } })
;(async () => {
    assert.equal((await m.exports.POST(request())).status, 410)
    assert.equal((await m.exports.POST(request('https://foreign.example'))).status, 403)
    actor = 'other-admin'
    assert.equal((await m.exports.POST(request())).status, 403)
    actor = null
    assert.equal((await m.exports.POST(request())).status, 403)
    console.log('PASS: owner pilot permanently closed; unauthorized/cross-origin denied; no provider calls or financial mutations.')
})().catch(e => { console.error(e); process.exitCode = 1 })
