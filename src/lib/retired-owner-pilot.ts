import 'server-only'
import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import { OWNER_PILOT_CONTRACT } from './academy-owner-pilot'

// Owner-requested deletion after the EUR 1 invoice was confirmed paid. The paid
// receipt stays in payments/Stripe. Acknowledge only known historical events;
// a different invoice/amount must still follow normal financial reconciliation.
const subscriptionId = 'sub_1Udn2HGk8vSBcmVdBP1LPICl'
const invoiceId = 'in_1Udn2HGk8vSBcmVdioT3OWbl'
const sessionHash = '77683eb3850fc953f2de382cd2aa147e798797a6fca9c401949c5116d32fa9b8'

export function isRetiredOwnerPilotEvent(event: Stripe.Event) {
    if (!event.livemode) return false
    if (event.type === 'invoice.paid') {
        const invoice = event.data.object
        return invoice.livemode && invoice.id === invoiceId && invoice.status === 'paid' && invoice.currency === 'eur' && invoice.amount_paid === 100
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object
        return subscription.livemode && subscription.id === subscriptionId && subscription.metadata?.purpose === 'academy_contract' && subscription.metadata?.academy_contract_id === OWNER_PILOT_CONTRACT
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        return session.livemode && session.mode === 'setup' && session.status === 'complete' && session.metadata?.purpose === 'academy_contract' && session.metadata?.academy_contract_id === OWNER_PILOT_CONTRACT && createHash('sha256').update(session.id).digest('hex') === sessionHash
    }
    return false
}
