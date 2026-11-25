const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
const id = '9b6c8ac0-a542-49ab-a116-6679c8640932'
const offer = { id, title: 'Donosti Cup', start_date: '2027-07-05', end_date: '2027-07-11', price: 1025, version: 'a'.repeat(64) }
const input = { request_id: '11111111-1111-4111-8111-111111111111', tournament_id: id, offer_version: offer.version, plan_choice: 'monthly', payment_choice: 'transfer', child_id: null, child_name: 'QA Player', birth_date: '2015-06-01', guardian_name: 'QA Guardian', phone: '600000000', club: 'Sin equipo', position: 'field', image_consent: false, privacy_consent: true, terms_consent: true, participation_consent: true, notes: '', website: '' }
let user = { id: 'owner', email: 'verified@example.invalid', email_confirmed_at: '2026-01-01' }, linked = true, available = offer, failure = false, admin = true
let calls = [], delivered = [], rows = {}
const db = {
    rpc: async (name, args) => { if (name === 'is_guardian_of') return { data: linked }; calls.push({ name, args }); return { data: name.startsWith('accept') ? 'child' : input.request_id, error: failure ? { message: 'Fixture failure' } : null } },
    from(table) { const q = { select() { return q }, eq() { return q }, is() { return q }, update(value) { calls.push({ update: table, value }); return q }, single: async () => ({ data: table === 'children' ? { full_name: 'Canonical Player', birth_date: '2014-01-02' } : rows[table], error: null }), then(resolve, reject) { return q.single().then(resolve, reject) } }; return q },
}
function load(file) {
    const m = { exports: {} }
    new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => {
        if (name === 'server-only') return {}
        if (name === 'next/cache') return { revalidatePath() {} }
        if (name === '@/lib/auth') return { requireUser: async () => { if (!user) throw Error('No session'); return { user, supabase: db } }, requireAdmin: async () => { if (!admin) throw Error('Not admin'); return { supabase: db } } }
        if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
        if (name === '@/lib/travel-tournament-server') return { getTravelTournamentOffer: async () => available }
        if (name === '@/lib/registration-email') return { deliverRegistrationEmails: async (...args) => delivered.push(args) }
        if (name === '@/lib/enrollment-onboarding') return { onboardAcceptedFamily: async () => ({ status: 'existing' }) }
        if (name === '@/lib/family-billing') return { familyBillingEmail: async () => { throw Error('Travel must not use subscriptions') } }
        if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts')
        return require(name)
    })
    return m.exports
}
;(async () => {
    const model = load('src/lib/travel-tournament.ts')
    const snapshot = model.travelTournamentSnapshot(offer, input)
    assert.equal(snapshot.total_cents, 102500)
    assert.deepEqual(snapshot.installments_cents, [15000, 15000, 15000, 15000, 15000, 15000, 12500])
    assert.equal(model.travelTournamentSnapshot(offer, { ...input, plan_choice: 'two' }).total_cents, 102500)
    assert.throws(() => model.travelTournamentSnapshot(offer, { ...input, offer_version: 'b'.repeat(64) }))
    for (const mutation of [{ payment_choice: 'monthly_card' }, { privacy_consent: false }, { participation_consent: false }, { birth_date: '2015-02-31' }, { image_consent: undefined }, { website: 'spam' }]) assert.equal(model.travelTournamentInput.safeParse({ ...input, ...mutation }).success, false)
    const actions = load('src/app/actions/travel-tournaments.ts')
    let result = await actions.submitTravelTournament({ ...input, email: 'forged@example.invalid', actor: 'attacker', total_cents: 1 })
    assert.equal(result.success, true)
    assert.equal(calls[0].args.verified_email, 'verified@example.invalid')
    assert.equal(calls[0].args.actor, 'owner')
    assert.equal(calls[0].args.payload.details.total_cents, 102500)
    assert.equal(delivered.length, 1)
    for (const state of ['unverified', 'missing', 'closed', 'foreign', 'stale']) {
        calls = []; delivered = []; user = { id: 'owner', email: 'verified@example.invalid', email_confirmed_at: '2026-01-01' }; available = offer; linked = true
        if (state === 'unverified') user.email_confirmed_at = null
        if (state === 'missing') user = null
        if (state === 'closed') available = null
        if (state === 'foreign') linked = false
        result = await actions.submitTravelTournament({ ...input, ...(state === 'foreign' ? { child_id: input.request_id } : {}), ...(state === 'stale' ? { offer_version: 'b'.repeat(64) } : {}) })
        assert.equal(result.success, false, state); assert.equal(calls.length, 0, state); assert.equal(delivered.length, 0, state)
    }
    user = { id: 'owner', email: 'verified@example.invalid', email_confirmed_at: '2026-01-01' }; available = offer; linked = true; calls = []
    result = await actions.submitTravelTournament({ ...input, child_id: input.request_id })
    assert.equal(result.success, true); assert.equal(calls[0].args.payload.child_name, 'Canonical Player'); assert.equal(calls[0].args.payload.birth_date, '2014-01-02')
    delivered = []; failure = true
    assert.equal((await actions.submitTravelTournament(input)).success, false); assert.equal(delivered.length, 0); failure = false
    admin = false; calls = []
    assert.equal((await actions.acceptTravelTournament(input.request_id, { version: offer.version, total: 102500, plan: 'monthly' })).success, false); assert.equal(calls.length, 0); admin = true
    rows.enrollment_requests = { email: user.email, tournament_details: { ...snapshot, accepted: { player_id: 'fixture' } } }; calls = []
    assert.equal((await actions.acceptTravelTournament(input.request_id, { version: offer.version, total: 102500, plan: 'monthly' })).success, true)
    assert.equal(calls[0].name, 'accept_travel_tournament_request'); assert.equal(calls[0].args.expected_total, 102500)
    const email = load('src/lib/registration-email-details.ts').registrationEmailDetails
    rows.enrollment_requests = { service: 'tournament', child_name: 'QA Player', status: 'new', tournament_details: snapshot }
    result = await email('enrollment', 'fixture', 'received')
    assert.match(result.subject, /Donosti/); assert.match(result.message, /150,00/); assert.match(result.message, /125,00/); assert.match(result.message, /Todavía no hagas ninguna transferencia/)
    assert.equal(result.welcome, undefined); assert.doesNotMatch(result.message, /Stripe|IBAN|tarjeta/)
    rows.enrollment_requests.status = 'enrolled'; rows.enrollment_requests.tournament_details = { ...snapshot, accepted: { player_id: 'fixture' }, onboarding: { access: 'existing' } }
    result = await email('enrollment', 'fixture', 'reviewed')
    assert.equal(result.welcome, true); assert.match(result.message, /exclusivamente por transferencia/); assert.match(result.message, /No hay cargos automáticos/); assert.doesNotMatch(result.message, /Stripe|IBAN|tarjeta/)
    assert.match(result.message, /Aceptar la plaza no acredita ningún ingreso/)
    console.log('PASS: travel form validation, verified identity, own-player data, stale quote, failure handling, admin review and transfer email templates')
})().catch(error => { console.error(error); process.exitCode = 1 })
