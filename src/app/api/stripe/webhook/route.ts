import type Stripe from 'stripe'
import { configuredStripe, verifyPaymentWebhook } from '@/lib/stripe-payments'
import { createAdminClient } from '@/lib/supabase/admin'
import { fulfillAcademyCheckout, fulfillAcademyInvoice, syncAcademyInvoiceStatus, syncAcademySubscription } from '@/lib/academy-stripe-contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supported = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'])

export async function POST(request: Request) {
    // Environment validation still requires explicit live activation.
    try {
        configuredStripe()
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
    if (event.type === 'invoice.paid') {
        try { await fulfillAcademyInvoice(event.data.object as Stripe.Invoice); return Response.json({ received: true }) }
        catch { return Response.json({ error: 'Invoice confirmation pending; retry' }, { status: 500 }) }
    }
    if (['invoice.payment_failed','invoice.payment_action_required'].includes(event.type)) {
        try { await syncAcademyInvoiceStatus(event.data.object as Stripe.Invoice); return Response.json({ received: true }) }
        catch { return Response.json({ error: 'Invoice status pending; retry' }, { status: 500 }) }
    }
    if (['customer.subscription.updated','customer.subscription.deleted'].includes(event.type)) {
        try { await syncAcademySubscription((event.data.object as Stripe.Subscription).id); return Response.json({ received: true }) }
        catch { return Response.json({ error: 'Subscription status pending; retry' }, { status: 500 }) }
    }
    if (!supported.has(event.type)) return Response.json({ received: true, ignored: true })
    const session = event.data.object as Stripe.Checkout.Session
    // Metadata routes each signed event to its own persisted ledger.
    const purpose = session.metadata?.purpose
    if (purpose === 'academy_contract') {
        try { await fulfillAcademyCheckout(session, event.type); return Response.json({ received: true }) }
        catch { return Response.json({ error: 'Contract confirmation pending; retry' }, { status: 500 }) }
    }
    if (purpose !== 'academy_connection_test' && purpose !== 'academy_receipt') return Response.json({ received: true, ignored: true })
    if (purpose === 'academy_connection_test' && session.livemode) return Response.json({ error: 'Diagnostic cannot be live' }, { status: 400 })
    const attemptId = session.metadata?.academy_attempt_id
    if (!attemptId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) return Response.json({ error: 'Missing attempt' }, { status: 422 })
    try {
        const { error } = await createAdminClient().rpc(purpose === 'academy_receipt' ? 'confirm_receipt_checkout' : 'confirm_stripe_connection_test', {
            event_input: event.id, type_input: event.type, attempt_input: attemptId, session_input: session.id,
            livemode_input: session.livemode, amount_input: session.amount_total,
            currency_input: session.currency, payment_status_input: session.payment_status,
            ...(purpose === 'academy_receipt' ? { intent_input: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null } : {}),
        })
        if (event.type === 'checkout.session.expired' && error?.code === 'P0002') return Response.json({ received: true, ignored: true })
        if (error) return Response.json({ error: 'Confirmation not committed; retry' }, { status: 500 })
        return Response.json({ received: true })
    } catch { return Response.json({ error: 'Confirmation unavailable; retry' }, { status: 500 }) }
}
