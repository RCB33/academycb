const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
let rows = [], emails = [], selections = [], authCalls = 0, campusAvailable = true
const db = { from(table) { assert.equal(table, 'enrollment_requests'); return { insert: async values => { rows.push(...values); return { error: null } } } } }
const authDb = {
    auth: { getUser: async () => { authCalls++; return { data: { user: null } } } },
    rpc: async () => ({ data: false }),
    from(table) {
        assert.equal(table, 'campuses')
        const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: campusAvailable ? { id: campusId, name: 'Campus fixture', end_date: '2099-12-31', public_program: null } : null }) }
        return query
    },
}
function load(file, overrides = {}) {
    const module = { exports: {} }
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', source)(name => {
        if (name in overrides) return overrides[name]
        if (name === 'server-only') return {}
        if (name === '@/lib/enrollment-payment') return load('src/lib/enrollment-payment.ts')
        if (name === '@/lib/i18n/client') return { useT: () => text => text }
        if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
        if (name === '@/lib/supabase/server') return { createClient: async () => authDb }
        if (name === '@/lib/registration-email') return { deliverRegistrationEmails: async (...args) => emails.push(args) }
        if (name === '@/lib/offering-server') return { academySelection: async input => {
            assert.ok(['cash', 'monthly_card'].includes(input.payment_choice))
            selections.push(input)
            return { ...input, plan: { name: 'Fixture plan' }, groups: [], quote: { monthly_price: 75, first_month: 75, percent: 100, enrollment_fee: 30, plus: 0, season_end: '2027-05-31' } }
        } }
        return require(name)
    }, module, module.exports)
    return module.exports
}
const { createEnrollmentRequest } = load('src/lib/enrollment.ts')
const { academyPaymentMessage } = load('src/lib/enrollment-payment.ts')
const { EnrollmentPaymentChoice } = load('src/app/(public)/inscripcion/enrollment-payment-choice.tsx')
const campusId = '11111111-1111-4111-8111-111111111111'
const child = { service: 'academy', child_name: 'Jugador ficticio', birth_date: '2015-01-02', plan_id: 'fixture', group_id: 'fixture', start_date: '2026-12-01', offer_version: 'fixture', payment_choice: 'cash' }
const family = { guardian_name: 'Tutor ficticio', email: 'qa@example.invalid', phone: '600000000', privacy_consent: 'on', terms_consent: 'on', website: '' }
function reset() { rows = []; emails = []; selections = []; authCalls = 0; campusAvailable = true }
async function request(children) { reset(); return createEnrollmentRequest({ ...family, children }) }
global.fetch = () => { throw new Error('Network is forbidden in this suite') }
;(async () => {
    for (const payment_choice of ['cash', 'monthly_card']) {
        assert.equal((await request([{ ...child, payment_choice }])).success, true)
        assert.equal(rows.length, 1)
        assert.equal(rows[0].academy_details.payment_choice, payment_choice)
        assert.equal(selections.length, 1)
        assert.equal(emails.length, 1)
    }
    for (const payment_choice of ['transfer', '', undefined]) {
        const result = await request([{ ...child, payment_choice }])
        assert.equal(result.success, false)
        assert.equal(result.error, academyPaymentMessage)
        assert.equal(rows.length, 0)
        assert.equal(authCalls, 0, 'Reject Academy-only payment before database access')
    }
    const invalid = await request([{ ...child, payment_choice: 'bitcoin' }])
    assert.equal(invalid.success, false)
    assert.doesNotMatch(invalid.error, /Invalid option|expected one of/)
    for (const payment_choice of ['cash', 'monthly_card', 'transfer']) {
        const result = await request([{ ...child, campus_interest: 'yes', payment_choice, plan_id: '', group_id: '', start_date: '' }])
        assert.equal(result.success, true)
        assert.match(result.message, /Academia \+ Campus/)
        assert.equal(rows[0].academy_details, null, 'Combined interest must require manual review, not automatic billing')
        assert.equal(rows[0].status, 'new')
        assert.match(rows[0].activity_name, /Academia \+ Campus/)
        assert.match(rows[0].notes, /Secretaría contactará/)
        assert.match(rows[0].notes, new RegExp({ cash: 'Efectivo', monthly_card: 'Tarjeta con Stripe', transfer: 'Transferencia bancaria' }[payment_choice]))
        assert.equal(selections.length, 0)
    }
    assert.equal((await request([{ ...child, payment_choice: 'transfer' }, { ...child, service: 'campus', activity_id: campusId, payment_choice: 'transfer' }])).success, true)
    assert.equal(rows.length, 2, 'Same player can request two different activities')
    assert.ok(rows.every(row => row.academy_details === null))
    assert.equal((await request([child, child])).success, false)
    assert.equal(rows.length, 0, 'Duplicate same activity remains blocked atomically')
    reset(); campusAvailable = false
    assert.equal((await createEnrollmentRequest({ ...family, children: [child, { ...child, service: 'campus', activity_id: campusId }] })).success, false)
    assert.equal(rows.length, 0)
    assert.equal((await request([{ ...child, campus_interest: 'yes', linked_child_id: campusId }])).success, false)
    assert.equal(rows.length, 0, 'Mixed requests do not bypass family ownership')
    for (const combined of [false, true]) {
        const html = renderToStaticMarkup(React.createElement(EnrollmentPaymentChoice, { prefix: 'player_0_', combined }))
        const choices = [...html.matchAll(/<option value="([^"]+)"/g)].map(match => match[1])
        assert.deepEqual(choices, combined ? ['cash', 'monthly_card', 'transfer'] : ['cash', 'monthly_card'])
        assert.match(html, /name="player_0_payment_choice"/)
        assert.ok(html.includes(combined ? 'Secretaría contactará' : academyPaymentMessage))
    }
    const offering = load('src/lib/offering-server.ts', {
        '@/lib/stripe-availability': {}, '@/lib/offering': {},
        '@/lib/supabase/admin': { createAdminClient: () => { throw new Error('Must reject before reading offers') } },
    })
    await assert.rejects(offering.academySelection({ payment_choice: 'transfer' }, child.birth_date), { message: academyPaymentMessage })
    console.log('PASS: Academy cash/card only, clear stale-form errors, combined requests with all three choices, manual review, activity/ownership checks, duplicate protection, payment UI. Mock inserts/emails only; no network, Stripe or payment records.')
})().catch(error => { console.error(error); process.exitCode = 1 })
