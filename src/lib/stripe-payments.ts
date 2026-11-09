import 'server-only'
import Stripe from 'stripe'
import { validatePaymentEnvironment } from './payment-rules'

export function configuredStripe(receiveOnly = false) {
    const mode = validatePaymentEnvironment({ key: process.env.STRIPE_SECRET_KEY, deployment: process.env.VERCEL_ENV, liveEnabled: process.env.STRIPE_LIVE_PAYMENTS_ENABLED, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, receiveOnly })
    return { mode, stripe: new Stripe(process.env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2, timeout: 15000 }) }
}

// Caller must authenticate ownership and reserve a persistent attempt before
// calling this helper. This module does not expose a public payment endpoint.
export async function createReceiptCheckout(input: { kind?: 'receipt' | 'event'; attemptId: string; amountCents: number; description: string; returnOrigin: string; expiresAt: number }) {
    const { stripe, mode } = configuredStripe()
    if (!/^[0-9a-f-]{36}$/i.test(input.attemptId) || !Number.isSafeInteger(input.amountCents) || input.amountCents < 50 || input.amountCents > 100_000_000) throw new Error('Intento de pago inválido.')
    const origin = new URL(input.returnOrigin)
    if (origin.protocol !== 'https:' || origin.origin !== input.returnOrigin || origin.username || origin.password) throw new Error('URL de retorno inválida.')
    const purpose = input.kind === 'event' ? 'academy_event' : 'academy_receipt'
    const returnPath = input.kind === 'event' ? '/torneos/inscripcion' : '/portal/pagos'
    const session = await stripe.checkout.sessions.create({
        mode: 'payment', locale: 'es', payment_method_types: ['card'],
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: input.amountCents, product_data: { name: input.description.slice(0, 200) } } }],
        metadata: { purpose, academy_attempt_id: input.attemptId },
        payment_intent_data: { metadata: { purpose, academy_attempt_id: input.attemptId } },
        success_url: `${origin.origin}${returnPath}?attempt=${input.attemptId}`,
        cancel_url: `${origin.origin}${returnPath}?attempt=${input.attemptId}&cancelled=1`,
        expires_at: input.expiresAt,
    }, { idempotencyKey: `academy-receipt-${mode}-${input.attemptId}` })
    if (session.livemode !== (mode === 'live') || !session.url?.startsWith('https://checkout.stripe.com/')) throw new Error('Respuesta de Stripe inesperada.')
    return { sessionId: session.id, url: session.url, mode }
}

export function verifyPaymentWebhook(rawBody: string, signature: string) {
    // Turning off new sales must not drop confirmations for existing charges.
    const { stripe, mode } = configuredStripe(true)
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!, 300)
    if (event.livemode !== (mode === 'live')) throw new Error('Evento de otro entorno rechazado.')
    return event
}
