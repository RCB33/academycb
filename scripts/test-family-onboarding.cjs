const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
let user = { id: 'family-1', email: 'marta@example.invalid', email_confirmed_at: '2026-11-20' }
let source = [[], [], []], failure = false, reads = [], creations = 0
function db() {
    creations++
    return { from(table) {
        const query = { table, fields: null, filter: null }
        reads.push(query)
        return { select(fields) { query.fields = fields; return this }, eq(key, value) { query.filter = ['eq', key, value]; return this }, ilike(key, value) { query.filter = ['ilike', key, value]; return this }, then(resolve, reject) {
            assert.equal(query.fields, 'status', 'Never fetch child details or private notes for onboarding')
            assert(query.filter, 'Every privileged query must be scoped')
            const index = table === 'event_registrations' ? 2 : query.filter[1] === 'email' ? 1 : 0
            return Promise.resolve({ data: source[index].map(status => ({ status })), error: failure ? { message: 'unavailable' } : null }).then(resolve, reject)
        } }
    } }
}
function load(file, mocks) {
    const m = { exports: {} }
    new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)(m, m.exports, name => Object.hasOwn(mocks, name) ? mocks[name] : require(name))
    return m.exports
}
const { getFamilyOnboardingState: state } = load('src/lib/family-onboarding.ts', {
    'server-only': {}, react: { cache: fn => fn }, '@/lib/admin-view': { getPortalViewer: async () => ({ user }) }, '@/lib/supabase/admin': { createAdminClient: db },
})
const { FamilyOnboarding } = load('src/components/portal/family-onboarding.tsx', { 'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) } })
;(async () => {
    assert.equal(await state(), 'start')
    assert.deepEqual(reads.map(q => q.filter), [['eq', 'submitted_by', user.id], ['ilike', 'email', user.email], ['eq', 'user_id', user.id]])
    for (const pending of ['new', 'contacted', 'interested']) { source = [[pending], [], []]; assert.equal(await state(), 'pending') }
    source = [[], ['new'], []]; assert.equal(await state(), 'pending', 'Anonymous application is found using verified Auth email')
    source = [[], [], ['requested']]; assert.equal(await state(), 'pending')
    source = [['new'], ['enrolled'], []]; assert.equal(await state(), 'review', 'Accepted but unlinked must not ask for another application')
    for (const closed of ['lost', 'unexpected']) { source = [[closed], [], []]; assert.equal(await state(), 'review') }
    source = [[], [], ['confirmed']]; assert.equal(await state(), 'review')
    failure = true; await assert.rejects(state, /No se pudo comprobar/); failure = false
    const confirmedUser = user; user = null; const before = creations; assert.equal(await state(), 'verify'); assert.equal(creations, before)
    user = { ...confirmedUser, email_confirmed_at: null }; assert.equal(await state(), 'verify'); assert.equal(creations, before)
    user = { ...confirmedUser, email: 'family_%@example.invalid' }; reads = []; source = [[], [], []]; await state(); assert.equal(reads[1].filter[2], 'family\\_\\%@example.invalid', 'Email must never act as a wildcard')
    for (const locale of ['es', 'ca', 'en']) {
        for (const kind of ['start', 'pending', 'review', 'verify']) {
            const html = renderToStaticMarkup(React.createElement(FamilyOnboarding, { state: kind, locale }))
            assert(html.includes('https://wa.me/34691179600'))
            assert.equal(html.includes('href="/inscripcion"'), kind === 'start')
            assert.equal(html.includes('href="/inscripcion?access=1"'), kind === 'verify')
            if (locale === 'ca' && kind === 'start') assert(html.includes('Completa la teva inscripció'))
            assert(!html.includes('Compte no vinculat'))
        }
    }
    let guardian = null, children = [], readError = null
    const scopedDb = { from(table) { return { select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: guardian, error: readError }), then: (yes, no) => Promise.resolve({ data: table === 'child_guardians' ? children.map(child => ({ child })) : [], error: readError }).then(yes, no) } } }
    const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }
    const box = ({ children }) => React.createElement('div', null, children)
    const Dashboard = load('src/app/portal/(authenticated)/dashboard/page.tsx', {
        '@/lib/admin-view': { getPortalViewer: async () => ({ user, supabase: scopedDb }) },
        '@/lib/i18n/server': { getT: async () => value => value, getLocale: async () => 'ca' },
        '@/lib/family-onboarding': { getFamilyOnboardingState: state },
        '@/components/portal/family-onboarding': { FamilyOnboarding },
        '@/components/portal/player-profile-details': { PlayerProfileDetails: box },
        '@/components/portal/player-photo-editor': { PlayerPhotoEditor: box },
        '@/components/ui/card': Object.fromEntries(['Card', 'CardHeader', 'CardTitle', 'CardContent', 'CardFooter'].map(k => [k, box])),
        '@/components/ui/button': { Button: box }, 'next/link': link,
        'next/navigation': { redirect: href => { throw Error('REDIRECT:' + href) } },
    }).default
    source = [[], [], []]
    assert(renderToStaticMarkup(await Dashboard()).includes('Continuar la inscripció'), 'No guardian must offer the next step')
    guardian = { id: 'g' }; assert(renderToStaticMarkup(await Dashboard()).includes('Continuar la inscripció'), 'Guardian with no player must also continue')
    readError = { message: 'failed' }; await assert.rejects(Dashboard, /No se pudo cargar/); readError = null
    children = [{ id: 'child-1', archived_at: null }]; await assert.rejects(Dashboard, /REDIRECT:\/portal\/child-1/, 'Existing player still opens their profile')
    console.log('PASS onboarding states, verified ownership, anonymous request match, wildcard isolation, read errors, ES/CA/EN, empty dashboard and existing player redirect. No database writes, accounts or emails.')
})().catch(error => { console.error(error); process.exitCode = 1 })
