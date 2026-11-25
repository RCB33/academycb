const fs = require('node:fs'), ts = require('typescript'), assert = require('node:assert/strict')
function load(file, mocks = {}) { const m = { exports: {} }; new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts', mocks) : require(name)); return m.exports }
const { NextRequest } = require('next/server')
const roles = load('src/lib/roles.ts')
const access = load('src/lib/family-portal-access.ts')
let linked = false, role = 'guardian', disabled = false, fail = false, authCalls = 0, sent = 0, authUser = { id: 'family', email: 'family@example.invalid', email_confirmed_at: 'yes' }
function query(table) {
  const filters = []
  const q = { select: () => q, eq: (key, value) => { filters.push([key, value]); return q }, ilike: (key, value) => { filters.push([key, value]); return q }, not: () => q, in: () => q, limit: () => q, maybeSingle: async () => ({ data: { role }, error: fail ? Error('failed') : null }), then: (yes, no) => {
    let data = []
    if (table === 'guardians') { if (linked && filters.some(([k, v]) => k === 'user_id' ? v === authUser.id : k === 'email' && v === authUser.email)) data = [{ id: 'g', user_id: authUser.id }] }
    if (table === 'profiles') data = role && role !== 'guardian' ? [{ id: authUser.id }] : []
    if (table === 'workers') data = disabled ? [{ access_enabled: false }] : []
    return Promise.resolve({ data, error: fail ? Error('failed') : null }).then(yes, no)
  } }; return q
}
const db = { from: query, auth: { getUser: async () => ({ data: { user: authUser } }), admin: { getUserById: async id => { authCalls++; assert.equal(id, authUser.id); return { data: { user: authUser }, error: null } } } } }
const codeAccess = load('src/lib/auth/portal-code-access.ts', { 'server-only': {}, '@/lib/roles': roles, '@/lib/supabase/admin': { createAdminClient: () => db } })
const route = load('src/app/api/auth/request-code/route.ts', { '@/lib/auth/portal-code-access': codeAccess, '@/lib/operational-log': { operationalLog() {} }, '@/lib/supabase/recovery-client': { createRecoveryClient: () => ({ auth: { resetPasswordForEmail: async (email, options) => { sent++; assert.equal(email, authUser.email); assert.equal(options.redirectTo, 'https://www.academycostabrava.com/portal/codigo?type=recovery'); return { error: null } } } }) } })
const middleware = load('src/lib/supabase/middleware.ts', { '@supabase/ssr': { createServerClient: () => db }, '@/lib/roles': roles, '@/lib/portal-return': load('src/lib/portal-return.ts'), '@/lib/family-portal-access': access })
const post = (email, origin = 'https://www.academycostabrava.com') => route.POST(new NextRequest('https://www.academycostabrava.com/api/auth/request-code', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ email }) }))
const visit = path => middleware.updateSession(new NextRequest('https://www.academycostabrava.com' + path))
;(async () => {
  assert.equal(await access.hasFamilyPortalAccess(db, authUser), false)
  assert.equal(await codeAccess.eligiblePortalCodeEmail('unknown@example.invalid'), null); assert.equal(authCalls, 0)
  authUser.user_metadata = { role: 'admin', intended_role: 'admin' }; assert.equal(await codeAccess.portalAccountEligible(db, authUser), false, 'User metadata cannot grant portal access'); delete authUser.user_metadata
  const unknown = await post('unknown@example.invalid'); assert.equal(unknown.status, 200); assert.equal(sent, 0)
  assert.equal((await post(authUser.email)).status, 200); assert.equal(sent, 0, 'Existing but unlinked account must not receive portal codes')
  for (const path of ['/portal', '/portal/dashboard', '/portal/pagos', '/portal/calendario', '/portal/muro', '/portal/tienda', '/portal/any-child']) {
    assert.equal((await visit(path)).headers.get('location'), 'https://www.academycostabrava.com/inscripcion/estado', path)
  }
  for (const path of ['/inscripcion', '/inscripcion/estado', '/torneos/inscripcion', '/portal/codigo', '/api/enrollment/combined']) assert.equal((await visit(path)).status, 200, 'Enrollment and password endpoints retain their own authorization')
  linked = true
  assert.equal(await access.hasFamilyPortalAccess(db, authUser), true)
  assert.equal((await visit('/portal/dashboard')).status, 200)
  assert.equal((await visit('/portal')).headers.get('location'), 'https://www.academycostabrava.com/portal/dashboard')
  const eligible = await post(authUser.email); assert.equal(eligible.status, 200); assert.equal(sent, 1); assert.deepEqual(await eligible.json(), await unknown.json(), 'Do not reveal account existence')
  authUser.email_confirmed_at = null; assert.equal(await access.hasFamilyPortalAccess(db, authUser), false)
  await post(authUser.email); assert.equal(sent, 2, 'A provisioned invitation can recover its code before email confirmation')
  authUser.email_confirmed_at = 'yes'; authUser.banned_until = '2999-01-01'; await post(authUser.email); assert.equal(sent, 2); delete authUser.banned_until
  disabled = true; await post(authUser.email); assert.equal(sent, 2); disabled = false
  linked = false
  for (const staffRole of ['admin', 'coach', 'finance', 'staff', 'marketing']) { role = staffRole; assert.equal(await codeAccess.eligiblePortalCodeEmail(authUser.email), authUser.email); assert.equal((await visit('/portal')).headers.get('location'), 'https://www.academycostabrava.com' + roles.getRoleHome(staffRole)) }
  role = null; assert.equal(await codeAccess.portalAccountEligible(db, authUser), false)
  role = 'guardian'; fail = true; await assert.rejects(() => access.hasFamilyPortalAccess(db, authUser)); assert.equal((await post(authUser.email)).status, 503); fail = false
  assert.equal((await post(authUser.email, 'https://evil.invalid')).status, 403)
  assert.equal((await post('not-an-email')).status, 400)
  const saved = authUser; authUser = null; assert.equal((await visit('/portal/dashboard')).headers.get('location'), 'https://www.academycostabrava.com/portal'); authUser = saved
  console.log('PASS unknown/unlinked/linked/invited/blocked/staff accounts, direct private URLs, public enrollment, code delivery eligibility, generic response, CSRF and read failures. All Auth and email calls mocked; no writes.')
})().catch(error => { console.error(error); process.exitCode = 1 })
