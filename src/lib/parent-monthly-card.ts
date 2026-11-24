import type { BillingRequest } from './billing-request'

type Membership = { id: string; child_id: string; status: string; plan_snapshot?: { frequency?: string } | null }
type Payment = { id: string; ref_id: string | null; type: string; concept_code?: string | null; status: string; due_date: string | null }
type Contract = { membership_id: string; mode: string; state: string }

/** Display eligibility only; the server RPC validates ownership, balances and locks again. */
export function monthlyCardCandidates(memberships: Membership[], payments: Payment[], requests: BillingRequest[], contracts: Contract[], mode: string, today: string, now: number) {
    const reserved = new Set(requests.filter(r => r.mode === mode && r.state !== 'cancelled' && (Date.parse(r.expires_at) > now || ['processing', 'active', 'cancelling', 'completed'].includes(r.state)))
        .flatMap(r => r.billing_request_items.map(i => i.payment_id)))
    // Match by payment IDs instead of relying on optional historic snapshots.
    const blockedMemberships = new Set(payments.filter(p => reserved.has(p.id)).map(p => p.ref_id))
    for (const contract of contracts) if (contract.mode === mode && !['expired', 'cancelled'].includes(contract.state)) blockedMemberships.add(contract.membership_id)
    return memberships.filter(m => ['active', 'pending_payment'].includes(m.status) && m.plan_snapshot?.frequency === 'mensual' && !blockedMemberships.has(m.id)
        && payments.some(p => p.ref_id === m.id && p.type === 'academy' && p.concept_code === 'monthly' && ['pending', 'failed'].includes(p.status) && p.due_date && p.due_date > today))
}
