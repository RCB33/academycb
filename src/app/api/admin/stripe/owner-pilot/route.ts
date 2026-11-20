import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe } from '@/lib/stripe-payments'
import { createAcademyCheckout, type AcademyContract } from '@/lib/academy-stripe-contract'
import { assertOwnerPilot, OWNER_PILOT_CONTRACT } from '@/lib/academy-owner-pilot'

export const maxDuration = 60
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
    if (request.headers.get('origin') !== 'https://www.academycostabrava.com' || new URL(request.url).origin !== 'https://www.academycostabrava.com') return reply({ error: 'Origen no permitido' }, 403)
    let stage = 'authorization'
    try {
        const { user } = await requireAdmin()
        const db = createAdminClient()
        const { data, error } = await db.from('academy_checkout_contracts').select('*').eq('id', OWNER_PILOT_CONTRACT).single()
        if (error || !data) return reply({ error: 'Prueba no preparada' }, 409)
        const c = data as AcademyContract
        assertOwnerPilot(c, user.id)
        if (!user.email_confirmed_at || user.email?.toLowerCase() !== 'rokecordoba@gmail.com') return reply({ error: 'Cuenta no autorizada' }, 403)
        const { stripe, mode } = configuredStripe()
        if (mode !== 'live') throw new Error('Pilot requires authorized LIVE environment')
        if (!['creating', 'open'].includes(c.state)) return reply({ state: c.state, message: 'La prueba ya se ha autorizado o cerrado; no se crea otro cobro.' })
        stage = 'checkout'
        if (c.stripe_session_id) {
            const session = await stripe.checkout.sessions.retrieve(c.stripe_session_id)
            if (!session.livemode || session.metadata?.academy_contract_id !== c.id) throw new Error('Session mismatch')
            return reply({ state: session.status, url: session.status === 'open' ? session.url : null })
        }
        if (new Date(c.expires_at).getTime() < Date.now() + 31 * 60_000) return reply({ error: 'La ventana de esta prueba ha caducado' }, 409)
        const session = await createAcademyCheckout(c, user.email)
        if (!session.livemode || session.mode !== 'setup' || !session.url?.startsWith('https://checkout.stripe.com/')) throw new Error('Unexpected Checkout')
        const bound = await db.from('academy_checkout_contracts').update({ stripe_session_id: session.id, checkout_url: session.url, state: 'open' }).eq('id', c.id).eq('state', 'creating').is('stripe_session_id', null).select('id')
        if (bound.error) throw new Error('Binding failed; retry same contract')
        if (!bound.data?.length) {
            const { data: existing } = await db.from('academy_checkout_contracts').select('stripe_session_id').eq('id', c.id).single()
            if (existing?.stripe_session_id !== session.id) { await stripe.checkout.sessions.expire(session.id); throw new Error('Pilot no longer open') }
        }
        return reply({ state: 'open', url: session.url, totalCents: 100, months: 1, renewal: false })
    } catch (error) {
        // Return only a provider error code, never credentials or request bodies.
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code).slice(0, 100) : 'pilot_unavailable'
        return reply({ error: code, stage }, stage === 'authorization' ? 403 : 409)
    }
}
