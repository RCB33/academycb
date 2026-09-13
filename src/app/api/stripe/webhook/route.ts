import type Stripe from 'stripe'
import { configuredStripe, verifyPaymentWebhook } from '@/lib/stripe-payments'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supported = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'])

export async function POST(request: Request) {
    // Fail closed until live fulfillment is implemented and audited.
    try {
        if (configuredStripe().mode !== 'test') return Response.json({ error: 'Live fulfillment disabled' }, { status: 503 })
    } catch { return Response.json({ error: 'Webhook not configured' }, { status: 503 }) }
    const signature = request.headers.get('stripe-signature')
    if (!signature) return Response.json({ error: 'Missing signature' }, { status: 400 })
    // Bound the raw payload even when Content-Length is absent or untrusted.
    let raw = ''
    try {
        const reader = request.body?.getReader()
        if (!reader) return Response.json({ error: 'Missing body' }, { status: 400 })
        const chunks: Uint8Array[] = []; let size = 0
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > 1_000_000) { await reader.cancel(); return Response.json({ error: 'Payload too large' }, { status: 413 }) }
            chunks.push(value)
        }
        raw = Buffer.concat(chunks).toString('utf8')
    } catch { return Response.json({ error: 'Invalid body' }, { status: 400 }) }
    let event: Stripe.Event
    try { event = verifyPaymentWebhook(raw, signature) }
    catch { return Response.json({ error: 'Invalid signature or environment' }, { status: 400 }) }
    if (!supported.has(event.type)) return Response.json({ received: true, ignored: true })
    const session = event.data.object as Stripe.Checkout.Session
    // This first adapter only processes diagnostic attempts. Never mutate real receipts.
    if (session.metadata?.purpose !== 'academy_connection_test') return Response.json({ received: true, ignored: true })
    const attemptId = session.metadata.academy_attempt_id
    if (!attemptId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) return Response.json({ error: 'Missing attempt' }, { status: 422 })
    try {
        const { error } = await createAdminClient().rpc('confirm_stripe_connection_test', {
            event_input: event.id, type_input: event.type, attempt_input: attemptId, session_input: session.id,
            livemode_input: session.livemode, amount_input: session.amount_total,
            currency_input: session.currency, payment_status_input: session.payment_status,
        })
        if (error) return Response.json({ error: 'Confirmation not committed; retry' }, { status: 500 })
        return Response.json({ received: true })
    } catch { return Response.json({ error: 'Confirmation unavailable; retry' }, { status: 500 }) }
}
