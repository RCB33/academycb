const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
const plan = { id: 'public', name: 'Academia', description: '', sessions_per_week: 1, price: 75, enrollment_fee: 30, season_start: '2026-09-15', season_end: '2027-05-31', is_active: true, updated_at: '2026-11-20' }
const privatePlan = { ...plan, id: 'private', is_active: false, price: 0, season_start: null, season_end: null }
let tables = { teams: [], membership_plans: [plan], campuses: [] }
const db = { from(table) { const q = { select() { return q }, not() { return q }, order() { return q }, then(resolve, reject) { return Promise.resolve({ data: tables[table], error: null }).then(resolve, reject) } }; return q } }
function load(file) {
    const m = { exports: {} }
    new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => {
        if (name === 'server-only') return {}
        if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
        if (name === '@/lib/stripe-availability') return { stripeCheckoutMode: async () => null }
        if (name === '@/lib/enrollment-payment') return { academyPaymentMessage: 'Invalid payment selection' }
        if (name === '@/lib/offering') return load('src/lib/offering.ts')
        return require(name)
    })
    return m.exports
}
const { getAcademyOffer, getCampusOffers } = load('src/lib/offering-server.ts')
;(async () => {
    const before = await getAcademyOffer()
    tables.membership_plans.push(privatePlan)
    tables.teams.push({ id: 'draft', status: 'inactive', public_offer: { published: false } })
    const after = await getAcademyOffer()
    assert.deepEqual(after, before, 'private incomplete drafts must not break or invalidate the public offer')
    tables.campuses.push({ id: 'draft', status: 'draft', public_program: {} })
    assert.deepEqual(await getCampusOffers(), [])
    tables.membership_plans = [{ ...privatePlan, is_active: true }]
    await assert.rejects(getAcademyOffer(), /price/, 'published invalid prices must still be rejected')
    tables.campuses[0].status = 'published'
    await assert.rejects(getCampusOffers(), /invalid_type/, 'published programs must still be validated')
    console.log('PASS: incomplete private plans/groups/campuses cannot crash public registration or change its version; published invalid offers are still rejected. No database writes.')
})().catch(error => { console.error(error); process.exitCode = 1 })
