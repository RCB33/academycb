'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe } from '@/lib/stripe-payments'

export async function cancelCheckout(kind: 'receipt' | 'academy' | 'event', id: string) {
    try {
        if (!['receipt','academy','event'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) return { error: 'Intento inválido.' }
        const { user } = await requireUser()
        const { stripe, mode } = configuredStripe(true)
        const admin = createAdminClient()
        const table = kind==='academy' ? 'academy_checkout_contracts' : kind==='event' ? 'event_checkout_attempts' : 'receipt_checkout_attempts'
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

// Legacy contracts do not carry the accepted season/group/partial-month snapshot.
// New card authorizations use the finite billing request generated from receipts.
export async function payAcademy(membershipId: string, choice: 'full' | 'monthly', accepted: boolean, quote: { unitCents: number; feeCents: number; months: number }):Promise<{error?:string;url?:string}> {
    void membershipId; void choice; void accepted; void quote
    return {error:'Autoriza las mensualidades desde el enlace de tu plaza aceptada en Pagos. Si no aparece, contacta con Academy. Matrícula y otros conceptos de Academia se pagan en efectivo. Contacta por WhatsApp al 691 17 96 00.'}
}

export async function payReceipt(paymentId: string):Promise<{error?:string;url?:string}> {
    void paymentId
    return {error:'Este recibo se paga por transferencia. Stripe se utiliza únicamente para las mensualidades de Academia.'}
}

export async function payEventRegistration(registrationId: string):Promise<{error?:string;url?:string}> {
    void registrationId
    return {error:'Los torneos se pagan por transferencia después de aceptar la solicitud.'}
}
