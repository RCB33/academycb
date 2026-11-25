import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eligiblePortalCodeEmail } from '@/lib/auth/portal-code-access'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'
import { operationalLog } from '@/lib/operational-log'

export const runtime = 'nodejs'
const schema = z.object({ email: z.string().trim().email().max(254) }).strict()
const headers = { 'Cache-Control': 'private, no-store' }
export async function POST(request: NextRequest) {
    if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'invalid_origin' }, { status: 403, headers })
    if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'invalid_request' }, { status: 415, headers })
    if (Number(request.headers.get('content-length') || 0) > 1024) return NextResponse.json({ error: 'invalid_request' }, { status: 413, headers })
    try {
        const raw = await request.text()
        if (new TextEncoder().encode(raw).length > 1024) return NextResponse.json({ error: 'invalid_request' }, { status: 413, headers })
        let input
        try { input = schema.safeParse(JSON.parse(raw)) } catch { return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers }) }
        if (!input.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers })
        const email = await eligiblePortalCodeEmail(input.data.email)
        if (email) {
            // Recovery never creates a user. Unknown/unlinked emails never reach Auth.
            const { error } = await createRecoveryClient().auth.resetPasswordForEmail(email, { redirectTo: `${request.nextUrl.origin}/portal/codigo?type=recovery` })
            if (error) throw new Error('Code delivery unavailable')
        }
        // Same response: never disclose whether an email belongs to an Academy family.
        return NextResponse.json({ success: true }, { headers })
    } catch {
        operationalLog('auth.unavailable', { source: 'portal', status: 503 })
        return NextResponse.json({ error: 'unavailable' }, { status: 503, headers })
    }
}
