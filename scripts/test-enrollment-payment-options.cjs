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
        assert.ok(['campuses', 'tournaments_internal'].includes(table))
        const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: campusAvailable ? { id: campusId, name: 'Campus fixture', title: 'Torneo fixture', end_date: '2099-12-31', public_program: null } : null }) }
        return query
    },
}
function load(file, overrides = {}) {
    const compiledModule = { exports: {} }
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'module', 'exports', source)(name => {
        if (name in overrides) return overrides[name]
        if (name === 'server-only') return {}
        // This suite checks payment choices; browser checks cover draft persistence.
        if (name === '@/components/forms/form-draft') return { useDraftState: (key, initial) => React.useState(initial) }
        if (name === '@/lib/auth') return { requireAdmin: async () => ({ supabase: authDb }) }
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
    }, compiledModule, compiledModule.exports)
    return compiledModule.exports
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
    for (const academy of ['cash', 'monthly_card']) {
        for (const campus of ['cash', 'transfer']) {
            for (const includeTournament of [false, true]) {
                const result = await request([{ ...child, payment_choice: academy, campus_interest: 'yes', campus_payment_choice: campus, tournament_interest: includeTournament ? 'yes' : 'no', tournament_payment_choice: 'transfer' }])
                assert.equal(result.success, true)
                assert.equal(rows.length, 1)
                assert.deepEqual(rows[0].academy_details.requested_payments, { academy, campus, ...(includeTournament ? { tournament: 'transfer' } : {}) })
                assert.equal(rows[0].academy_details.payment_choice, academy)
                assert.equal(rows[0].status, 'new')
                assert.equal(selections.length, 1, 'Academy selection is validated even with additional activities')
                assert.match(rows[0].notes, /Campus: /)
                assert.match(rows[0].notes, /no confirma las plazas adicionales/)
            }
        }
    }
    for (const payment_choice of ['transfer', '']) {
        assert.equal((await request([{ ...child, payment_choice, campus_interest: 'yes', campus_payment_choice: 'cash' }])).error, academyPaymentMessage)
        assert.equal(rows.length, 0)
        assert.equal((await request([{ ...child, payment_choice }, { ...child, service: 'campus', activity_id: campusId, payment_choice: 'transfer' }])).error, academyPaymentMessage)
    }
    const policy = load('src/lib/enrollment-payment.ts')
    for (const campus_payment_choice of ['monthly_card', '', undefined]) {
        assert.equal((await request([{ ...child, campus_interest: 'yes', campus_payment_choice }])).error, policy.campusPaymentMessage)
        assert.equal(rows.length, 0)
    }
    for (const tournament_payment_choice of ['cash', 'monthly_card', '', undefined]) {
        assert.equal((await request([{ ...child, tournament_interest: 'yes', tournament_payment_choice }])).error, policy.tournamentPaymentMessage)
        assert.equal(rows.length, 0)
    }
    assert.equal((await request([{ ...child, tournament_interest: 'yes', tournament_payment_choice: 'transfer' }])).success, true)
    assert.deepEqual(rows[0].academy_details.requested_payments, { academy:'cash', tournament:'transfer' })
    assert.equal((await request([{ ...child, campus_interest:'no', campus_payment_choice:'transfer', tournament_interest:'no', tournament_payment_choice:'transfer' }])).success, true)
    assert.deepEqual(rows[0].academy_details.requested_payments, { academy:'cash' }, 'Unchecked stale interests are not submitted')
    for (const service of policy.paymentServices) {
        for (const payment_choice of ['monthly_card','cash','transfer']) {
            const result = await request([{ ...child, service, activity_id: service === 'academy' ? '' : campusId, payment_choice }])
            const valid = policy.isAllowedEnrollmentPayment(service,payment_choice)
            assert.equal(result.success, valid, `${service}/${payment_choice}`)
            if (!valid) { assert.equal(result.error,policy.paymentMessages[service]); assert.equal(rows.length,0) }
            else if (service === 'campus') assert.equal(rows[0].campus_details.payment_choice,payment_choice)
        }
        const html = renderToStaticMarkup(React.createElement(EnrollmentPaymentChoice, { prefix: service + '_', service }))
        const choices = [...html.matchAll(/<option value="([^"]+)"/g)].map(match => match[1])
        assert.deepEqual(choices, policy.allowedEnrollmentPayments[service])
        assert.match(html, new RegExp('name="'+service+'_payment_choice"'))
        assert.ok(html.includes(policy.paymentMessages[service]))
    }
    assert.equal((await request([child, { ...child, service:'campus',activity_id:campusId,payment_choice:'cash' }, { ...child, service:'tournament',activity_id:campusId,payment_choice:'transfer' }])).success,true)
    assert.equal(rows.length,3)
    assert.equal((await request([child,child])).success,false)
    assert.equal(rows.length,0,'Duplicate requests remain atomic')
    assert.equal((await request([{ ...child, campus_interest:'yes', campus_payment_choice:'cash', linked_child_id:campusId }])).success,false)
    assert.equal(rows.length,0,'Combined requests do not bypass guardian ownership')
    reset();campusAvailable=false
    assert.equal((await createEnrollmentRequest({ ...family,children:[child,{ ...child,service:'campus',activity_id:campusId,payment_choice:'cash' }] })).success,false)
    assert.equal(rows.length,0,'Unavailable activities do not insert partial requests')
    assert.deepEqual(policy.requestedPaymentChoices({service:'academy',academy_details:{payment_choice:'transfer',requested_payments:{academy:'transfer',campus:'monthly_card',tournament:'cash'}}}),{},'Invalid historical preferences are never presented as allowed')
    assert.deepEqual(policy.requestedPaymentChoices({service:'academy',academy_details:{payment_choice:'cash',requested_payments:{academy:'cash',campus:'transfer',tournament:'transfer'}}}),{academy:'cash',campus:'transfer',tournament:'transfer'})
    const campusSchema = load('src/lib/campus-registration.ts').campusRegistrationSchemaFor()
    for (const value of ['cash','transfer']) assert.equal(campusSchema.shape.payment_choice.parse(value),value)
    assert.equal(campusSchema.shape.payment_choice.safeParse('monthly_card').success,false)
    assert.equal(campusSchema.shape.payment_choice.parse(undefined),'transfer','Previous dedicated Campus forms were transfer-only')
    const tournamentSchema = load('src/lib/christmas-tournaments.ts').tournamentRegistrationSchema
    assert.equal(tournamentSchema.shape.payment_choice.parse('transfer'),'transfer')
    for (const value of ['cash','monthly_card']) assert.equal(tournamentSchema.shape.payment_choice.safeParse(value).success,false)
    const offering = load('src/lib/offering-server.ts', {
        '@/lib/stripe-availability': {}, '@/lib/offering': {},
        '@/lib/supabase/admin': { createAdminClient: () => { throw new Error('Must reject before reading offers') } },
    })
    await assert.rejects(offering.academySelection({ payment_choice: 'transfer' }, child.birth_date), { message: academyPaymentMessage })
    console.log('PASS: independent payments for one/two/three activities, strict per-service validation, separate persistence, stale interests ignored, dedicated Campus/Tournament schemas, ownership and atomicity, payment UI. Mock inserts/emails only; no network, Stripe or payment records.')
})().catch(error => { console.error(error); process.exitCode = 1 })
