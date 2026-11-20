import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'
import { createClient } from '@/lib/supabase/server'
import { openPasswordSetup, sealPasswordSetup, setupCookie, setupLifetime } from '@/lib/auth/password-setup'
import { getRoleHome, isAppRole } from '@/lib/roles'
import { billingReturnPath } from '@/lib/billing-request'

export const runtime = 'nodejs'
const verifySchema = z.object({ action: z.literal('verify'), email: z.string().trim().email().max(254), token: z.string().regex(/^\d{6,10}$/), type: z.enum(['invite', 'recovery']) })
const passwordSchema = z.object({ action: z.literal('password'), password: z.string().min(8).max(72), confirmation: z.string(), next: z.string().max(200).optional() }).refine(v => v.password === v.confirmation && Buffer.byteLength(v.password, 'utf8') <= 72)
function reply(body: object, status = 200) {
    return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
}
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/auth/email-code', maxAge: setupLifetime }

export async function GET(request: NextRequest) {
    const pending = openPasswordSetup(request.cookies.get(setupCookie)?.value)
    return reply({ step: pending ? 'password' : 'code', email: pending?.email })
}

export async function POST(request: NextRequest) {
    // Do not accept cross-site verification or password changes (including login CSRF).
    if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ error: 'invalid_origin' }, 403)
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'invalid_request' }, 415)
    if (Number(request.headers.get('content-length') || 0) > 4096) return reply({ error: 'invalid_request' }, 413)
    try {
        const raw = await request.text()
        if (raw.length > 4096) return reply({ error: 'invalid_request' }, 413)
        let input: unknown
        try { input = JSON.parse(raw) } catch { return reply({ error: 'invalid_request' }, 400) }
        const verify = verifySchema.safeParse(input)
        const client = createRecoveryClient()
        if (verify.success) {
            const { data, error } = await client.auth.verifyOtp({ email: verify.data.email.toLowerCase(), token: verify.data.token, type: verify.data.type })
            if (error || !data.session || !data.user?.email) return reply({ error: error?.status === 429 ? 'rate_limit' : 'invalid_code' }, error?.status === 429 ? 429 : 400)
            const pending = sealPasswordSetup({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, userId: data.user.id, email: data.user.email, expiresAt: Date.now() + setupLifetime * 1000 })
            const response = reply({ step: 'password', email: data.user.email })
            response.cookies.set(setupCookie, pending, cookieOptions)
            return response
        }
        const password = passwordSchema.safeParse(input)
        if (!password.success) return reply({ error: 'invalid_request' }, 400)
        const pending = openPasswordSetup(request.cookies.get(setupCookie)?.value)
        if (!pending) return reply({ error: 'expired_setup' }, 401)
        // Refresh checks that the pending Auth session has not been revoked.
        const { data: session, error: sessionError } = await client.auth.refreshSession({ refresh_token: pending.refresh_token })
        if (sessionError || !session.session || session.user?.id !== pending.userId || session.user.email !== pending.email) {
            const response = reply({ error: 'expired_setup' }, 401)
            response.cookies.set(setupCookie, '', { ...cookieOptions, maxAge: 0 })
            return response
        }
        const { error: updateError } = await client.auth.updateUser({ password: password.data.password, data: { password_set: true } })
        if (updateError) {
            const response = reply({ error: updateError.code === 'same_password' ? 'same_password' : updateError.code === 'weak_password' ? 'weak_password' : 'password_failed' }, 400)
            // Preserve the rotated token for a safe retry after a rejected password.
            response.cookies.set(setupCookie, sealPasswordSetup({ ...pending, access_token: session.session.access_token, refresh_token: session.session.refresh_token }), cookieOptions)
            return response
        }
        // Invalidate the temporary recovery session before issuing a normal login.
        await client.auth.signOut({ scope: 'local' })
        const browserClient = await createClient()
        const { data: login, error: loginError } = await browserClient.auth.signInWithPassword({ email: pending.email, password: password.data.password })
        let next = '/portal'
        if (!loginError && login.user) {
            const { data: profile } = await browserClient.from('profiles').select('role').eq('id', login.user.id).maybeSingle()
            next = (profile?.role === 'guardian' && billingReturnPath(password.data.next || null)) || getRoleHome(isAppRole(profile?.role) ? profile.role : null)
        }
        const response = reply({ success: true, next })
        response.cookies.set(setupCookie, '', { ...cookieOptions, maxAge: 0 })
        return response
    } catch { return reply({ error: 'unavailable' }, 503) }
}
