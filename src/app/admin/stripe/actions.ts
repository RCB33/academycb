'use server'

import { requireAdmin } from '@/lib/auth'
import { stripeTestRequest } from '@/lib/stripe-test'

export async function createStripeTestCheckout() {
    const { user } = await requireAdmin()
    try {
        const host = process.env.VERCEL_URL
        if (!host || !/^[a-z0-9.-]+\.vercel\.app$/.test(host)) return { error: 'No se reconoce la URL de Preview.' }
        const base = `https://${host}/admin/stripe`
        const body = new URLSearchParams({ mode: 'payment', locale: 'es', 'payment_method_types[0]': 'card', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': '100', 'line_items[0][price_data][product_data][name]': 'PRUEBA TÉCNICA ACADEMY — sin pedido real', success_url: `${base}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${base}?cancelled=1`, 'metadata[purpose]': 'academy_connection_test', 'metadata[admin_id]': user.id })
        const session = await stripeTestRequest('checkout/sessions', body, `academy-test-${user.id}-${Math.floor(Date.now() / 60000)}`)
        if (session.livemode !== false || typeof session.url !== 'string' || !session.url.startsWith('https://checkout.stripe.com/')) return { error: 'Stripe devolvió una sesión inesperada. Prueba detenida.' }
        return { url: session.url }
    } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo iniciar la prueba.' } }
}
