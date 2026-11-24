const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(file, mocks = {}) {
    const m = { exports: {} }
    new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => name==='@/lib/operational-log'?load('src/lib/operational-log.ts',{'server-only':{}}):mocks[name] || require(name))
    return m.exports
}
const model = load('src/lib/portal-usage.ts')
const base = { id: 'contact', full_name: 'Álvaro Tutor', email: 'test@example.invalid', user_id: 'family', role: 'guardian', players: [{ id: 'child', full_name: 'María Jugadora' }], first_seen_at: null, last_seen_at: null, duplicateEmail: false }
const rows = [base, { ...base, id: 'visited', user_id: 'other', first_seen_at: '2026-11-20T10:00:00Z' }, { ...base, id: 'internal', user_id: 'admin', role: 'admin', first_seen_at: '2026-11-20T10:00:00Z' }, { ...base, id: 'unlinked', user_id: null, duplicateEmail: true }]
assert.deepEqual(model.portalUsageSummary(rows), { total: 4, accounts: 2, visited: 1, pending: 1, noAccount: 2 })
assert.deepEqual(model.filterPortalUsage(rows, 'pending', 'maria').map(row => row.id), ['contact'])
assert.equal(model.filterPortalUsage(rows, 'all', 'alvaro').length, 4)
assert.equal(model.filterPortalUsage(rows, 'all', 'nobody').length, 0)
assert.deepEqual(model.filterPortalUsage(rows, 'review', '').map(row => row.id), ['internal', 'unlinked'])
assert.deepEqual(model.filterPortalUsage(rows, 'visited', '').map(row => row.id), ['visited'])
assert.equal(model.portalUsageSummary([...rows,{...base,id:'duplicate'}]).accounts,2)
const unlinkedAccount={...base,id:'account-new',user_id:'new-family',players:[],unlinkedAccount:true}
assert.equal(model.portalUsageSummary([...rows,unlinkedAccount]).accounts,3)
assert.equal(model.portalUsageSummary([...rows,unlinkedAccount]).noAccount,2)
assert.ok(model.needsPortalReview(unlinkedAccount))
assert.deepEqual(model.filterPortalUsage(rows,'accounts','').map(row=>row.id),['contact','visited'])

let authorized = true, dbError = null, writes = [], roles = [], effect
const route = load('src/app/api/portal/visit/route.ts', {
    '@/lib/auth': { requireRole: async allowed => { roles.push(allowed); if (!authorized) throw Error('denied'); return { user: { id: 'verified-family' } } } },
    '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async (name, args) => { writes.push([name, args]); return { error: dbError } } }) },
})
const origin = 'https://www.academycostabrava.com'
const request = (requestOrigin = origin) => new Request(origin + '/api/portal/visit', { method: 'POST', headers: requestOrigin ? { origin: requestOrigin } : {}, body: JSON.stringify({ user_id: 'forged-admin', first_seen_at: '2000-01-01' }) })
const flush = () => new Promise(resolve => setImmediate(resolve))
;(async () => {
    assert.equal((await route.POST(request('https://foreign.example'))).status, 403)
    assert.equal((await route.POST(request(null))).status, 403)
    assert.equal(writes.length, 0)
    authorized = false
    assert.equal((await route.POST(request())).status, 403)
    assert.equal(writes.length, 0)
    authorized = true
    assert.equal((await route.POST(request())).status, 204)
    assert.deepEqual(writes[0], ['record_guardian_portal_visit', { p_user_id: 'verified-family' }])
    assert(roles.every(allowed => allowed.length === 1 && allowed[0] === 'guardian'))
    dbError = { message: 'unavailable' }
    assert.equal((await route.POST(request())).status, 503)

    let listener, timer, posts = 0, ok = false
    global.document = { visibilityState: 'hidden', addEventListener(_, fn) { listener = fn }, removeEventListener(_, fn) { assert.equal(fn, listener); listener = null } }
    global.window = { setInterval(fn) { timer = fn; return 1 }, clearInterval(id) { assert.equal(id, 1); timer = null } }
    global.fetch = async () => { posts++; return { ok } }
    const recorder = load('src/components/portal/visit-recorder.tsx', { react: { useEffect(fn) { effect = fn } } })
    recorder.PortalVisitRecorder({ userId: 'family' })
    const cleanup = effect()
    await flush()
    assert.equal(posts, 0, 'hidden tabs must not count')
    document.visibilityState = 'visible'
    await listener()
    assert.equal(posts, 1)
    ok = true
    await listener()
    assert.equal(posts, 2, 'failed record must allow a retry')
    await listener()
    await timer()
    assert.equal(posts, 2, 'visible events and timer must be throttled')
    cleanup()
    assert.equal(listener, null)
    assert.equal(timer, null)
    console.log('PASS: family-only counts, search/filter, internal accounts excluded, origin/session guard, no forged identity/timestamp, hidden tabs ignored, retry and throttling. Mock services; no emails or database writes.')
})().catch(error => { console.error(error); process.exitCode = 1 })
