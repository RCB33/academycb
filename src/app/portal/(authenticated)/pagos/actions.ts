'use server'

import { headers } from 'next/headers'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe, createReceiptCheckout } from '@/lib/stripe-payments'
import { stripePaymentOrigin } from '@/lib/stripe-return-origin'
import { createAcademyCheckout, type AcademyContract } from '@/lib/academy-stripe-contract'

export async function cancelCheckout(kind: 'receipt' | 'academy', id: string) {
    try {
        if (!['receipt','academy'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) return { error: 'Intento inválido.' }
        const { user } = await requireUser()
        const { stripe, mode } = configuredStripe()
        const admin = createAdminClient()
        const table = kind==='academy' ? 'academy_checkout_contracts' : 'receipt_checkout_attempts'
        const { data: attempt } = await admin.from(table).select('id,owner_id,mode,state,stripe_session_id').eq('id',id).single()
        if (!attempt || attempt.owner_id!==user.id || attempt.mode!==mode || attempt.state!=='open' || !attempt.stripe_session_id) return { error: 'No hay un intento abierto que puedas cancelar.' }
        const session = await stripe.checkout.sessions.retrieve(attempt.stripe_session_id)
        if (session.livemode!==(mode==='live') || session.status==='complete') return { error: 'El proceso ya se ha completado. No se puede cancelar desde aquí; estamos comprobando su confirmación.' }
        if (session.status==='open') await stripe.checkout.sessions.expire(session.id)
        const { error } = await admin.from(table).update({state:'expired'}).eq('id',id).eq('state','open')
        if (error) return { error: 'Stripe ha cerrado el enlace. Estamos actualizando su estado.' }
        return { success:true }
    } catch { return { error:'No se pudo confirmar la cancelación. No inicies otro pago hasta revisar el estado.' } }
}

export async function payAcademy(membershipId: string, choice: 'full' | 'monthly', accepted: boolean, quote: { unitCents: number; feeCents: number; months: number }) {
    try {
        if (!accepted || !['full','monthly'].includes(choice) || !/^[0-9a-f-]{36}$/i.test(membershipId)) return { error: 'Revisa y acepta el importe y la duración antes de continuar.' }
        const { user } = await requireUser()
        if (!user.email) return { error: 'Falta un correo de contacto.' }
        const { mode, stripe } = configuredStripe()
        const origin = stripePaymentOrigin((await headers()).get('origin'), mode, process.env.VERCEL_URL)
        const admin = createAdminClient()
        const { data, error } = await admin.rpc('reserve_academy_contract', { membership_input: membershipId, owner_input: user.id, mode_input: mode, choice_input: choice, origin_input: origin })
        if (error || !data) return { error: 'Esta modalidad no está disponible o ya existen cobros. Consulta con Academy antes de cambiar el plan.' }
        const c = data as AcademyContract
        // The browser cannot set prices. It can only confirm the exact quote
        // displayed when consent was given; reject stale prices before Stripe.
        if (!quote || Number(c.unit_cents) !== quote.unitCents || Number(c.fee_cents) !== quote.feeCents || Number(c.months) !== quote.months) return { error: 'Las condiciones han cambiado. Actualiza la página y revisa el importe y la duración antes de aceptar de nuevo.' }
        if (c.owner_id !== user.id || c.return_origin !== origin) return { error: 'Ya hay un pago abierto por otro tutor o desde otra página.' }
        if (c.choice !== choice) return { error: 'Ya has iniciado otra modalidad. Termínala o espera a que caduque antes de cambiarla.' }
        if (['active','completed'].includes(c.state)) return { error: 'Tu contrato ya está activado. No necesitas volver a contratarlo.' }
        if (!c.stripe_session_id && c.state==='creating' && new Date(c.expires_at).getTime()<=Date.now()) {
            await admin.from('academy_checkout_contracts').update({state:'expired'}).eq('id',c.id).eq('state','creating').is('stripe_session_id',null)
            return {error:'El intento anterior ha caducado. Actualiza la página para elegir de nuevo.'}
        }
        if (c.stripe_session_id) {
            const session = await stripe.checkout.sessions.retrieve(c.stripe_session_id)
            if (session.status === 'expired') {
                await admin.from('academy_checkout_contracts').update({ state: 'expired' }).eq('id', c.id).eq('state','open')
                return { error: 'La sesión ha caducado. Puedes volver a iniciar el pago.' }
            }
            if (session.status === 'complete') return { error: 'Estamos confirmando la activación. No repitas el proceso.' }
            if (session.url?.startsWith('https://checkout.stripe.com/')) return { url: session.url }
            return { error: 'No se puede recuperar la sesión de pago.' }
        }
        const session = await createAcademyCheckout(c, user.email)
        if (session.livemode !== (mode === 'live') || !session.url?.startsWith('https://checkout.stripe.com/')) return { error: 'La sesión no coincide con el entorno autorizado.' }
        const { data: bound, error: bindError } = await admin.from('academy_checkout_contracts').update({ stripe_session_id: session.id, checkout_url: session.url, state: 'open' }).eq('id', c.id).eq('state','creating').select('id')
        if (bindError || !bound?.length) return { error: 'No se pudo guardar el enlace. Reintenta para recuperar la misma sesión.' }
        return { url: session.url }
    } catch { return { error: 'No se pudo abrir el plan de pago. No repitas ningún cobro ya completado; revisa su estado.' } }
}

export async function payReceipt(paymentId: string) {
    try {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) return { error: 'Recibo inválido.' }
        const { user } = await requireUser()
        const { mode, stripe } = configuredStripe()
        const origin = stripePaymentOrigin((await headers()).get('origin'), mode, process.env.VERCEL_URL)
        const admin = createAdminClient()
        // Amount, source eligibility and family ownership are resolved inside
        // the transaction. No browser-supplied price or user ID is accepted.
        const { data: attempt, error } = await admin.rpc('reserve_receipt_checkout', { payment_input: paymentId, owner_input: user.id, mode_input: mode, origin_input: origin })
        if (error || !attempt) return { error: 'Este recibo no está disponible para pagar. Revisa su estado o consulta con Academy.' }
        if (attempt.owner_id !== user.id) return { error: 'Otro tutor ya tiene un pago abierto para este recibo. Espera a que termine o caduque.' }
        if (attempt.state === 'paid') return { error: mode === 'test' ? 'Este recibo ya tiene una prueba completada. El recibo real no se ha modificado.' : 'El recibo ya está pagado.' }
        if (attempt.return_origin !== origin) return { error: 'Hay un pago abierto desde otro dominio. Utiliza la página original o espera a que caduque.' }
        if (!attempt.stripe_session_id && attempt.state==='creating' && new Date(attempt.expires_at).getTime()<=Date.now()) {
            await admin.from('receipt_checkout_attempts').update({state:'expired'}).eq('id',attempt.id).eq('state','creating').is('stripe_session_id',null)
            return {error:'El intento anterior ha caducado. Puedes volver a iniciar el pago.'}
        }
        if (attempt.stripe_session_id) {
            const existing = await stripe.checkout.sessions.retrieve(attempt.stripe_session_id)
            if (existing.livemode !== (mode === 'live')) return { error: 'El entorno de Stripe no coincide. Pago detenido.' }
            if (existing.status === 'expired') {
                await admin.from('receipt_checkout_attempts').update({ state: 'expired' }).eq('id', attempt.id).eq('state', 'open')
                return { error: 'La sesión anterior ha caducado. Puedes volver a pulsar para abrir otra.' }
            }
            if (existing.status === 'complete') return { error: 'El pago se está confirmando. No repitas el cobro; actualiza el estado en unos segundos.' }
            if (existing.url?.startsWith('https://checkout.stripe.com/')) return { url: existing.url }
            return { error: 'No se puede recuperar la sesión. Contacta con Academy.' }
        }
        const session = await createReceiptCheckout({ attemptId: attempt.id, amountCents: Number(attempt.amount_cents), description: `${mode === 'test' ? 'PRUEBA — ' : ''}${attempt.description}`, returnOrigin: origin, expiresAt: Math.floor(new Date(attempt.expires_at).getTime() / 1000) })
        const { data: bound, error: bindError } = await admin.from('receipt_checkout_attempts').update({ stripe_session_id: session.sessionId, checkout_url: session.url, state: 'open' }).eq('id', attempt.id).eq('state', 'creating').select('id')
        if (bindError || !bound?.length) return { error: 'No se pudo guardar el enlace. Reintenta; no se creará un segundo cargo.' }
        return { url: session.url }
    } catch {
        return { error: 'El pago con tarjeta no está disponible en este momento. No se ha confirmado ningún cobro; consulta el estado antes de reintentar.' }
    }
}
