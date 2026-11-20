import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from './supabase/admin'
import { configuredStripe } from './stripe-payments'

export type CheckoutResult = {
    state: 'paid' | 'authorized' | 'processing' | 'attention' | 'incomplete' | 'expired' | 'ended'
    amountCents?: number
    endsAt?: number
    startsAt?: number
    finite?: boolean
    test: boolean
}

// A high-entropy Stripe session ID is the receipt capability. Return only a
// minimal result, never names, emails, card data, invoices or account identifiers.
// This function is read-only: loading/refreshing the page cannot charge anyone.
export async function checkoutResult(sessionId: string): Promise<CheckoutResult | null> {
    if (!/^cs_(?:live|test)_[a-zA-Z0-9]{20,200}$/.test(sessionId)) return null
    const db = createAdminClient()
    const { data: contract, error: ce } = await db.from('academy_checkout_contracts').select('id,mode,choice,total_cents,unit_cents,fee_cents,stripe_schedule_id,stripe_subscription_id').eq('stripe_session_id', sessionId).maybeSingle()
    if (ce) throw new Error('Result unavailable')
    let binding: { purpose: string; key: string; id: string; mode: string; setup: boolean; total: number; unit: number; fee: number; schedule: string | null; subscription: string | null }
    if (contract) {
        binding = { purpose: 'academy_contract', key: 'academy_contract_id', id: contract.id, mode: contract.mode, setup: contract.choice === 'monthly', total: Number(contract.total_cents), unit: Number(contract.unit_cents), fee: Number(contract.fee_cents), schedule: contract.stripe_schedule_id, subscription: contract.stripe_subscription_id }
    } else {
        const { data: attempt, error } = await db.from('billing_request_attempts').select('id,request_id,schedule_id,subscription_id').eq('session_id', sessionId).maybeSingle()
        if (error) throw new Error('Result unavailable')
        if (!attempt) return null
        const { data: request, error: re } = await db.from('billing_requests').select('mode,kind,total_cents,billing_request_items(amount_cents,position)').eq('id', attempt.request_id).single()
        if (re || !request) throw new Error('Result unavailable')
        const items = [...request.billing_request_items].sort((a,b) => a.position - b.position)
        binding = { purpose: 'academy_billing_request', key: 'billing_attempt_id', id: attempt.id, mode: request.mode, setup: request.kind === 'subscription', total: Number(request.total_cents), unit: Number(items[0]?.amount_cents), fee: 0, schedule: attempt.schedule_id, subscription: attempt.subscription_id }
    }
    const { stripe, mode } = configuredStripe(true)
    if (binding.mode !== mode) return null
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['setup_intent'] })
    if (session.livemode !== (mode === 'live') || session.metadata?.purpose !== binding.purpose || session.metadata?.[binding.key] !== binding.id || session.mode !== (binding.setup ? 'setup' : 'payment')) return null
    const base = { test: mode === 'test' }
    if (session.status === 'expired') return { ...base, state: 'expired' }
    if (session.status !== 'complete') return { ...base, state: 'incomplete' }
    if (!binding.setup) {
        if (session.payment_status !== 'paid') return { ...base, state: 'processing' }
        if (session.currency !== 'eur' || session.amount_total !== binding.total) return null
        return { ...base, state: 'paid', amountCents: binding.total }
    }
    const setup = session.setup_intent
    const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (!setup || typeof setup === 'string' || setup.status !== 'succeeded' || setup.livemode !== session.livemode || setup.metadata?.[binding.key] !== binding.id || !customer || (typeof setup.customer === 'string' ? setup.customer : setup.customer?.id) !== customer) return { ...base, state: 'processing' }
    const authorized: CheckoutResult = { ...base, state: 'authorized', amountCents: binding.unit + binding.fee }
    if (!binding.schedule) return authorized // signed webhook may still be running
    const schedule = await stripe.subscriptionSchedules.retrieve(binding.schedule)
    if (schedule.livemode !== session.livemode || schedule.metadata?.purpose !== binding.purpose || schedule.metadata?.[binding.key] !== binding.id || (typeof schedule.customer === 'string' ? schedule.customer : schedule.customer.id) !== customer) return null
    authorized.finite = schedule.end_behavior === 'cancel'
    authorized.startsAt = schedule.phases[0]?.start_date
    authorized.endsAt = schedule.phases.at(-1)?.end_date
    const sid = typeof schedule.subscription === 'string' ? schedule.subscription : schedule.subscription?.id
    const subscriptionId = binding.subscription || sid
    if (!subscriptionId) return { ...authorized, state: schedule.status === 'canceled' || schedule.status === 'completed' ? 'ended' : 'authorized' }
    if (sid && subscriptionId !== sid) return null
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] })
    if (sub.livemode !== session.livemode || sub.metadata?.purpose !== binding.purpose || sub.metadata?.[binding.key] !== binding.id) return null
    const invoice = typeof sub.latest_invoice === 'object' ? sub.latest_invoice as Stripe.Invoice | null : null
    if (invoice?.status === 'paid') {
        const expected = binding.unit + (invoice.billing_reason === 'subscription_create' ? binding.fee : 0)
        if (invoice.currency !== 'eur' || invoice.livemode !== session.livemode || invoice.amount_paid !== expected || !['subscription_create','subscription_cycle'].includes(invoice.billing_reason || '')) return null
        return { ...authorized, state: 'paid', amountCents: invoice.amount_paid }
    }
    if (sub.status === 'canceled') return { ...authorized, state: 'ended' }
    if (['past_due','unpaid','incomplete','incomplete_expired','paused'].includes(sub.status) || (invoice?.status === 'open' && invoice.attempt_count > 0) || invoice?.status === 'uncollectible' || invoice?.status === 'void') return { ...authorized, state: 'attention' }
    return authorized
}
