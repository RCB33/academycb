const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { NextRequest } = require('next/server')
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-only-password-setup-secret'
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'family@example.invalid' }
const session = { access_token: 'private-access-token', refresh_token: 'private-refresh-token' }
let verifyError, refreshError, updateError, loginError, loginThrows, profileThrows, calls = [], used = false
const recovery = { auth: {
    async verifyOtp(input) { calls.push(['verify', input]); if (verifyError || used || input.token !== '12345678') return { data: {}, error: verifyError || { status: 400 } }; used = true; return { data: { user, session }, error: null } },
    async refreshSession(input) { calls.push(['refresh', input]); return { data: { user, session: { ...session, refresh_token: 'rotated-refresh-token' } }, error: refreshError } },
    async updateUser(input) { calls.push(['update', input]); return { data: { user }, error: updateError } },
    async signOut(input) { calls.push(['revoke', input]); return { error: null } },
} }
const browser = { auth: { async signInWithPassword(input) { calls.push(['login', input]); if (loginThrows) throw new Error('network interrupted'); return { data: { user }, error: loginError } } }, from() { return { select() { return this }, eq() { return this }, async maybeSingle() { if (profileThrows) throw new Error('profile unavailable'); return { data: { role: 'guardian' } } } } } }
const modules = new Map()
function load(file) {
    if (modules.has(file)) return modules.get(file)
    const m = { exports: {} }
    new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => {
        if (name === 'server-only') return {}
        if (name === '@/lib/supabase/recovery-client') return { createRecoveryClient: () => recovery }
        if (name === '@/lib/supabase/server') return { createClient: async () => browser }
        if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts')
        return require(name)
    })
    modules.set(file, m.exports)
    return m.exports
}
const route = load('src/app/api/auth/email-code/route.ts')
const crypto = load('src/lib/auth/password-setup.ts')
const origin = 'https://www.academycostabrava.com'
function request(input, cookie = '', overrides = {}) {
    return new NextRequest(origin + '/api/auth/email-code', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie: `${crypto.setupCookie}=${cookie}` } : {}), ...overrides }, body: JSON.stringify(input) })
}
const verify = { action: 'verify', email: user.email, token: '12345678', type: 'invite' }
const password = { action: 'password', password: 'A-new-test-password-99', confirmation: 'A-new-test-password-99' }
;(async () => {
    const pending = { ...session, email: user.email, userId: user.id, expiresAt: Date.now() + 600000 }
    const sealed = crypto.sealPasswordSetup(pending)
    assert.deepEqual(crypto.openPasswordSetup(sealed), pending)
    assert.equal(crypto.openPasswordSetup((sealed[0] === 'x' ? 'y' : 'x') + sealed.slice(1)), null)
    assert.equal(crypto.openPasswordSetup(crypto.sealPasswordSetup({ ...pending, expiresAt: Date.now() - 1 })), null)
    assert.equal(crypto.openPasswordSetup('invalid'), null)
    assert(!sealed.includes(session.refresh_token))
    assert.equal((await route.POST(request(verify, '', { origin: 'https://other.example' }))).status, 403)
    assert.equal(calls.length, 0)
    assert.equal((await route.POST(request({ ...verify, token: 'wrong' }))).status, 400)
    assert.equal((await route.POST(request({ ...verify, type: 'email_change' }))).status, 400)
    assert.equal((await route.POST(request({ ...verify, token: '00000000' }))).headers.get('set-cookie'), null)
    verifyError = { status: 429 }
    assert.equal((await route.POST(request(verify))).status, 429)
    verifyError = null
    const verified = await route.POST(request(verify))
    assert.equal(verified.status, 200)
    const cookie = verified.cookies.get(crypto.setupCookie).value
    assert.match(verified.headers.get('set-cookie'), /HttpOnly/i)
    assert.match(verified.headers.get('set-cookie'), /SameSite=strict/i)
    assert.doesNotMatch(verified.headers.get('set-cookie'), /sb-.*auth-token/)
    assert.deepEqual(await verified.json(), { step: 'password', email: user.email })
    assert.equal(calls.filter(c => ['update', 'login'].includes(c[0])).length, 0)
    assert.equal((await route.POST(request(verify))).status, 400, 'OTP cannot be reused')
    assert.equal((await route.POST(request(password))).status, 401, 'Password cannot be set without verified code')
    assert.equal((await route.POST(request({ ...password, confirmation: 'mismatch' }, cookie))).status, 400)
    assert.equal((await route.POST(request({ ...password, password: 'short', confirmation: 'short' }, cookie))).status, 400)
    refreshError = { status: 401 }
    assert.equal((await route.POST(request(password, cookie))).status, 401, 'Revoked session rejected')
    refreshError = null; updateError = { code: 'weak_password' }; calls = []
    const failed = await route.POST(request(password, cookie))
    assert.equal(failed.status, 400)
    assert.equal((await failed.json()).error, 'weak_password')
    assert.equal(crypto.openPasswordSetup(failed.cookies.get(crypto.setupCookie).value).refresh_token, 'rotated-refresh-token')
    assert(!calls.some(c => c[0] === 'login'), 'Rejected password cannot publish a session')
    updateError = null; calls = []
    const success = await route.POST(request({ ...password, next: '//attacker.example' }, cookie))
    assert.equal(success.status, 200)
    assert.deepEqual(calls.map(c => c[0]), ['refresh', 'update', 'revoke', 'login'])
    assert.deepEqual(await success.json(), { success: true, next: '/portal/dashboard' })
    assert.equal(success.cookies.get(crypto.setupCookie).value, '')
    assert.equal(calls[1][1].data.password_set, true)
    assert.equal(calls[3][1].email, user.email)
    loginError = { status: 400 }
    assert.deepEqual(await (await route.POST(request(password, cookie))).json(), { success: true, next: '/portal' }, 'Saved password remains usable if automatic sign-in fails')
    loginError = null; loginThrows = true
    const interruptedLogin = await route.POST(request(password, cookie))
    assert.equal(interruptedLogin.status, 200)
    assert.deepEqual(await interruptedLogin.json(), { success: true, next: '/portal' }, 'Automatic login exception must not turn a saved password into a failure')
    assert.equal(interruptedLogin.cookies.get(crypto.setupCookie).value, '')
    loginThrows = false; profileThrows = true
    assert.deepEqual(await (await route.POST(request(password, cookie))).json(), { success: true, next: '/portal' }, 'Role lookup failure preserves successful password change')
    profileThrows = false
    const get = await route.GET(new NextRequest(origin + '/api/auth/email-code', { headers: { cookie: `${crypto.setupCookie}=${cookie}` } }))
    assert.match(get.headers.get('cache-control'), /no-store/)
    assert.deepEqual(await get.json(), { step: 'password', email: user.email })
    const { renderCommunicationEmail } = load('src/lib/communication-email.ts')
    const html = renderCommunicationEmail('Welcome', 'Accepted', undefined, { email: '<script>@example.com', status: 'invited' })
    assert.match(html, /código de bienvenida/); assert.match(html, /Crea tu contraseña personal/)
    assert(!html.includes('<script>')); assert.match(html, /&lt;script&gt;/)
    console.log('PASS: OTP gating, no session before password, replay/error/expiry/tampering/CSRF, revoked recovery, password retries, session rotation, safe redirects and email escaping. Mock Auth only.')
})().catch(error => { console.error(error); process.exitCode = 1 })
