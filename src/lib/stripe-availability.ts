import 'server-only'
import { validatePaymentEnvironment } from './payment-rules'
import { createAdminClient } from './supabase/admin'

export function stripeSalesConfigured() {
    try {
        return validatePaymentEnvironment({ key: process.env.STRIPE_SECRET_KEY, deployment: process.env.VERCEL_ENV, liveEnabled: process.env.STRIPE_LIVE_PAYMENTS_ENABLED, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET })
    } catch { return null }
}

export async function stripeCheckoutMode() {
    const mode = stripeSalesConfigured()
    if (mode !== 'live') return mode
    const { data, error } = await createAdminClient().from('academy_settings').select('value').eq('key', 'payment_card_enabled').maybeSingle()
    return !error && data?.value === 'true' ? mode : null
}

export async function requireStripeCheckout() {
    if (!await stripeCheckoutMode()) throw new Error('El pago con tarjeta todavía no está disponible.')
}
