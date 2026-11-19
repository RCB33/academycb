import 'server-only'
import type Stripe from 'stripe'
import { configuredStripe } from './stripe-payments'

export const WEBHOOK_PROBE_PURPOSE = 'academy_webhook_delivery_probe_v1'

export type WebhookProbeStatus = {
    sessionId: string
    expired: boolean
    verified: boolean
    eventId: string | null
    receivedAt: string | null
}

function probeSession(session: Stripe.Checkout.Session) {
    return session.metadata?.purpose === WEBHOOK_PROBE_PURPOSE &&
        /^[0-9a-f-]{36}_\d+$/.test(session.metadata.probe_key || '') &&
        session.mode === 'payment' && session.amount_total === 100 && session.currency === 'eur' &&
        session.payment_status === 'unpaid' && !session.customer && !session.subscription
}

function status(session: Stripe.Checkout.Session): WebhookProbeStatus {
    if (!probeSession(session)) throw new Error('Invalid probe')
    const eventId = session.metadata?.probe_event_id || null
    const receivedAt = session.metadata?.probe_received_at || null
    return {
        sessionId: session.id, expired: session.status === 'expired',
        verified: session.status === 'expired' && Boolean(eventId?.startsWith('evt_') && receivedAt),
        eventId, receivedAt,
    }
}

// No customer, card, subscription, invoice or Academy payment is created. The
// Checkout URL is deliberately never returned or logged. Only an administrator
// may call this helper. Idempotency also bounds repeated clicks to one / 5 min.
export async function startWebhookProbe(adminId: string): Promise<WebhookProbeStatus> {
    if (!/^[0-9a-f-]{36}$/.test(adminId)) throw new Error('Invalid administrator')
    const { stripe, mode } = configuredStripe(true)
    const bucket = Math.floor(Date.now() / 300_000)
    const probeKey = `${adminId}_${bucket}`
    const session = await stripe.checkout.sessions.create({
        mode: 'payment', payment_method_types: ['card'], customer_creation: 'if_required',
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: 100,
            product_data: { name: 'ACADEMY · DIAGNÓSTICO WEBHOOK · NO PAGAR' } } }],
        metadata: { purpose: WEBHOOK_PROBE_PURPOSE, probe_key: probeKey },
        success_url: 'https://www.academycostabrava.com/admin/stripe',
        cancel_url: 'https://www.academycostabrava.com/admin/stripe',
        expires_at: bucket * 300 + 3600,
    }, { idempotencyKey: `academy-webhook-probe-${mode}-${probeKey}` })
    if (session.livemode !== (mode === 'live') || !probeSession(session)) throw new Error('Invalid probe response')
    // An idempotent create can return the original open response after expiry.
    const current = await stripe.checkout.sessions.retrieve(session.id)
    if (current.status === 'open') {
        try { await stripe.checkout.sessions.expire(session.id, {}, { idempotencyKey: `expire-${session.id}` }) }
        catch {
            // Expiration may have succeeded before a network timeout.
            if ((await stripe.checkout.sessions.retrieve(session.id)).status !== 'expired') throw new Error('Probe expiry pending')
        }
    }
    return status(await stripe.checkout.sessions.retrieve(session.id))
}

export async function readWebhookProbe(sessionId?: string): Promise<WebhookProbeStatus | null> {
    const { stripe, mode } = configuredStripe(true)
    if (sessionId && !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) throw new Error('Invalid session ID')
    const session = sessionId ? await stripe.checkout.sessions.retrieve(sessionId) :
        (await stripe.checkout.sessions.list({ limit: 100 })).data.find(s => s.metadata?.purpose === WEBHOOK_PROBE_PURPOSE)
    if (!session) return null
    if (session.livemode !== (mode === 'live')) throw new Error('Invalid environment')
    return status(session)
}

// Called ONLY after the public webhook has verified Stripe's real signature and
// environment. The receipt lives on this isolated Stripe session, not in payments.
export async function recordWebhookProbe(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session
    if (event.type !== 'checkout.session.expired' || !probeSession(session) || session.status !== 'expired') throw new Error('Invalid probe event')
    const { stripe, mode } = configuredStripe(true)
    const current = await stripe.checkout.sessions.retrieve(session.id)
    if (!probeSession(current) || current.status !== 'expired' || current.livemode !== (mode === 'live') ||
        current.metadata?.probe_key !== session.metadata?.probe_key) throw new Error('Invalid probe session')
    if (current.metadata?.probe_event_id) return // Duplicate delivery: no repeated write.
    await stripe.checkout.sessions.update(session.id, { metadata: {
        probe_event_id: event.id, probe_received_at: new Date().toISOString(),
    } }, { idempotencyKey: `webhook-probe-received-${event.id}` })
}
