import 'server-only'
import type Stripe from 'stripe'
import { configuredStripe } from './stripe-payments'
import { createAdminClient } from './supabase/admin'

export type AcademyContract = {
    id: string; owner_id: string; membership_id: string; mode: 'test' | 'live'; choice: 'full' | 'monthly'; state: string;
    plan_name: string; unit_cents: number; fee_cents: number; months: number; total_cents: number; return_origin: string;
    stripe_session_id: string | null; stripe_subscription_id: string | null; stripe_schedule_id: string | null; expires_at: string;
}

export async function createAcademyCheckout(c: AcademyContract, email: string) {
    const { stripe, mode } = configuredStripe()
    if (c.mode !== mode) throw new Error('Contract environment mismatch')
    const metadata = { purpose: 'academy_contract', academy_contract_id: c.id }
    const common: Stripe.Checkout.SessionCreateParams = {
        locale: 'es', payment_method_types: ['card'], metadata,
        expires_at: Math.floor(new Date(c.expires_at).getTime() / 1000),
        success_url: `${c.return_origin}/portal/pagos?contract=${c.id}`,
        cancel_url: `${c.return_origin}/portal/pagos?contract=${c.id}&cancelled=1`,
    }
    if (c.choice === 'full') {
        return stripe.checkout.sessions.create({ ...common, mode: 'payment', customer_email: email,
            payment_intent_data: { metadata },
            line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: Number(c.total_cents), product_data: { name: `${mode === 'test' ? 'PRUEBA — ' : ''}${c.plan_name} · Pago completo (matrícula incluida)` } } }],
        }, { idempotencyKey: `academy-contract-checkout-${c.id}` })
    }
    const customer = await stripe.customers.create({ email, metadata }, { idempotencyKey: `academy-contract-customer-${c.id}` })
    const description = `${c.months} mensualidades de ${(Number(c.unit_cents)/100).toFixed(2)} €, matrícula única ${(Number(c.fee_cents)/100).toFixed(2)} €. Total ${(Number(c.total_cents)/100).toFixed(2)} €. Sin renovación automática.`
    // Setup first: the finite schedule is installed before any recurring charge.
    return stripe.checkout.sessions.create({ ...common, mode: 'setup', currency: 'eur', customer: customer.id,
        setup_intent_data: { metadata, description }, custom_text: { submit: { message: description } },
    }, { idempotencyKey: `academy-contract-checkout-${c.id}` })
}

export async function fulfillAcademyCheckout(session: Stripe.Checkout.Session, eventType: string) {
    const admin = createAdminClient()
    const { stripe, mode } = configuredStripe()
    const id = session.metadata?.academy_contract_id
    const { data, error } = await admin.from('academy_checkout_contracts').select('*').eq('id', id).single()
    // Deleted TEST fixtures or old expired attempts have no financial action
    // left to perform. Never apply this exception to a paid/completed event.
    if (eventType === 'checkout.session.expired' && error?.code === 'PGRST116') return
    if (error || !data) throw new Error('Contract not found')
    const c = data as AcademyContract
    if (c.mode !== mode || session.livemode !== (mode === 'live') || c.stripe_session_id !== session.id) throw new Error('Contract session mismatch')
    if (eventType === 'checkout.session.expired') {
        await admin.from('academy_checkout_contracts').update({ state: 'expired' }).eq('id', c.id).in('state', ['creating','open'])
        return
    }
    if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(eventType)) return
    if (c.choice === 'full') {
        if (session.payment_status !== 'paid') return
        if (session.currency !== 'eur' || session.amount_total !== Number(c.total_cents)) throw new Error('Contract amount mismatch')
        const { error: collectError } = await admin.rpc('collect_academy_contract', { contract_input: c.id, collection_input: session.id, subscription_input: null, session_input: session.id, livemode_input: session.livemode, amount_input: session.amount_total, first_input: true })
        if (collectError) throw new Error('Contract collection not committed')
        return
    }
    if (c.stripe_schedule_id) return
    const setupId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id
    if (!setupId) throw new Error('Setup missing')
    const setup = await stripe.setupIntents.retrieve(setupId)
    const customer = typeof setup.customer === 'string' ? setup.customer : setup.customer?.id
    const paymentMethod = typeof setup.payment_method === 'string' ? setup.payment_method : setup.payment_method?.id
    const sessionCustomer = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (setup.status !== 'succeeded' || setup.livemode !== session.livemode || setup.metadata?.academy_contract_id !== c.id || !paymentMethod || !customer || customer !== sessionCustomer) throw new Error('Setup not authorized')
    const price = await stripe.prices.create({ currency: 'eur', unit_amount: Number(c.unit_cents), recurring: { interval: 'month' }, product_data: { name: c.plan_name }, metadata: { academy_contract_id: c.id } }, { idempotencyKey: `academy-contract-price-${c.id}` })
    const product = typeof price.product === 'string' ? price.product : price.product.id
    const schedule = await stripe.subscriptionSchedules.create({
        customer, start_date: 'now', end_behavior: 'cancel', metadata: { academy_contract_id: c.id, purpose: 'academy_contract' },
        default_settings: { default_payment_method: paymentMethod, collection_method: 'charge_automatically' },
        phases: [{ duration: { interval: 'month', interval_count: c.months }, items: [{ price: price.id, quantity: 1 }],
            discounts: '', proration_behavior: 'none', metadata: { academy_contract_id: c.id, purpose: 'academy_contract' },
            ...(Number(c.fee_cents) ? { add_invoice_items: [{ quantity: 1, price_data: { currency: 'eur', product, unit_amount: Number(c.fee_cents) } }] } : {}),
        }],
    }, { idempotencyKey: `academy-contract-schedule-${c.id}` })
    const subscriptionId = typeof schedule.subscription === 'string' ? schedule.subscription : schedule.subscription?.id
    if (schedule.livemode !== session.livemode || schedule.end_behavior !== 'cancel' || !subscriptionId) throw new Error('Finite schedule not confirmed')
    const { data: bound, error: bindError } = await admin.from('academy_checkout_contracts').update({ stripe_schedule_id: schedule.id, stripe_subscription_id: subscriptionId, state: 'active' }).eq('id', c.id).is('stripe_schedule_id', null).in('state', ['creating','open']).select('id')
    if (bindError) throw new Error('Schedule binding not committed')
    if (!bound?.length) {
        const { data: existing } = await admin.from('academy_checkout_contracts').select('stripe_schedule_id,stripe_subscription_id').eq('id', c.id).single()
        if (existing?.stripe_schedule_id !== schedule.id || existing?.stripe_subscription_id !== subscriptionId) throw new Error('Schedule binding not confirmed')
    }
}

export async function fulfillAcademyInvoice(invoice: Stripe.Invoice) {
    // Accommodate the pinned webhook version and the current Stripe API shape.
    const legacy = invoice as Stripe.Invoice & { subscription?: string | { id: string }; subscription_details?: { metadata?: Record<string,string> } }
    const subValue = invoice.parent?.subscription_details?.subscription || legacy.subscription
    const subscriptionId = typeof subValue === 'string' ? subValue : subValue?.id
    if (!subscriptionId) return
    const { stripe, mode } = configuredStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (subscription.metadata.purpose !== 'academy_contract') return
    if (invoice.livemode !== (mode === 'live') || invoice.status !== 'paid' || invoice.currency !== 'eur' || !['subscription_create','subscription_cycle'].includes(invoice.billing_reason || '')) throw new Error('Unexpected recurring invoice')
    const { error } = await createAdminClient().rpc('collect_academy_contract', {
        contract_input: subscription.metadata.academy_contract_id, collection_input: invoice.id, subscription_input: subscriptionId,
        session_input: null, livemode_input: invoice.livemode, amount_input: invoice.amount_paid, first_input: invoice.billing_reason === 'subscription_create',
    })
    if (error) throw new Error('Invoice confirmation not committed')
    await syncAcademySubscription(subscriptionId)
}

// Retrieve current Stripe state, rather than trusting event delivery order.
// A failed installment remains outstanding; it never creates a paid receipt.
export async function syncAcademySubscription(subscriptionId: string) {
    const { stripe, mode } = configuredStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] })
    if (subscription.metadata.purpose !== 'academy_contract') return
    if (subscription.livemode !== (mode === 'live')) throw new Error('Subscription environment mismatch')
    const latest = typeof subscription.latest_invoice === 'object' ? subscription.latest_invoice : null
    const attention = ['past_due','unpaid','incomplete','incomplete_expired','paused'].includes(subscription.status) || (latest?.status === 'open' && latest.attempt_count > 0)
    const billingStatus = subscription.status === 'canceled' ? 'ended' : attention ? 'attention' : 'active'
    const { data, error } = await createAdminClient().from('academy_checkout_contracts').update({ billing_status: billingStatus, billing_updated_at: new Date().toISOString() }).eq('id',subscription.metadata.academy_contract_id).eq('mode',mode).eq('stripe_subscription_id',subscriptionId).select('id')
    if (error || !data?.length) throw new Error('Subscription status binding pending')
}

export async function syncAcademyInvoiceStatus(invoice: Stripe.Invoice) {
    const legacy = invoice as Stripe.Invoice & { subscription?: string | { id: string } }
    const sub = invoice.parent?.subscription_details?.subscription || legacy.subscription
    const id = typeof sub === 'string' ? sub : sub?.id
    if (id) await syncAcademySubscription(id)
}
