'use server'

import { requireAdmin } from '@/lib/auth'
import { stripeTestRequest, stripeTestKey } from '@/lib/stripe-test'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createStripeTestCheckout() {
    const { user } = await requireAdmin()
    try {
        stripeTestKey()
        const host = process.env.VERCEL_URL
        if (!host || !/^[a-z0-9.-]+\.vercel\.app$/.test(host)) return { error: 'No se reconoce la URL de Preview.' }
        const admin = createAdminClient()
        const { data: attempt, error } = await admin.rpc('reserve_stripe_connection_test', { owner_input: user.id, return_base_input: `https://${host}/admin/stripe` })
        if (error || !attempt) return { error: 'No se pudo registrar el intento. No se ha iniciado ningún cobro.' }
        if (attempt.checkout_url && attempt.state === 'open') {
            if (new Date(attempt.expires_at).getTime() <= Date.now()) {
                const existing = await stripeTestRequest(`checkout/sessions/${attempt.stripe_session_id}`)
                if (existing.status === 'expired' && existing.livemode === false) {
                    await admin.from('stripe_test_attempts').update({ state: 'expired' }).eq('id', attempt.id).eq('state', 'open')
                    return { error: 'La sesión anterior ha caducado. Pulsa otra vez para iniciar una nueva prueba.' }
                }
                return { error: 'La sesión anterior sigue pendiente de conciliación. Comprueba la confirmación automática antes de repetir.' }
            }
            if (!attempt.checkout_url.startsWith('https://checkout.stripe.com/')) return { error: 'URL de prueba inválida.' }
            return { url: attempt.checkout_url }
        }
        const base = attempt.return_base
        const body = new URLSearchParams({ mode: 'payment', locale: 'es', 'payment_method_types[0]': 'card', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': '100', 'line_items[0][price_data][product_data][name]': 'PRUEBA TÉCNICA ACADEMY — sin pedido real', success_url: `${base}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${base}?cancelled=1`, 'metadata[purpose]': 'academy_connection_test', 'metadata[admin_id]': user.id, 'metadata[academy_attempt_id]': attempt.id, expires_at: String(Math.floor(new Date(attempt.expires_at).getTime() / 1000)) })
        const session = await stripeTestRequest('checkout/sessions', body, `academy-test-attempt-${attempt.id}`)
        if (session.livemode !== false || typeof session.url !== 'string' || !session.url.startsWith('https://checkout.stripe.com/')) return { error: 'Stripe devolvió una sesión inesperada. Prueba detenida.' }
        const { error: bindError } = await admin.from('stripe_test_attempts').update({ stripe_session_id: session.id, checkout_url: session.url, state: 'open' }).eq('id', attempt.id).eq('state', 'creating')
        if (bindError) return { error: 'No se pudo guardar la sesión. Vuelve a intentarlo; se recuperará el mismo intento.' }
        return { url: session.url }
    } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo iniciar la prueba.' } }
}
