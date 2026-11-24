import { requireAdmin } from '@/lib/auth'
import { adminReadAll } from '@/lib/admin-read-all'
import type { PortalUsageRow } from '@/lib/portal-usage'
import { FamilyPortalUsage } from '@/components/admin/family-portal-usage'
import { monthlyCardCandidates } from '@/lib/parent-monthly-card'
import type { BillingRequest } from '@/lib/billing-request'
import { stripeSalesConfigured } from '@/lib/stripe-availability'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function FamilyPortalUsagePage() {
    const { supabase } = await requireAdmin()
    const [guardians, profiles, activity, memberships, payments, requests, contracts] = await Promise.all([
        adminReadAll((from, to) => supabase.from('guardians').select('id,full_name,email,user_id,children:child_guardians(child:children(id,full_name,archived_at))').order('id').range(from, to)),
        adminReadAll((from, to) => supabase.from('profiles').select('id,role,full_name').order('id').range(from, to)),
        adminReadAll((from, to) => supabase.from('guardian_portal_activity').select('user_id,first_seen_at,last_seen_at').order('user_id').range(from, to)),
        adminReadAll((from, to) => supabase.from('academy_memberships').select('id,child_id,status,plan_snapshot').order('id').range(from, to)),
        adminReadAll((from, to) => supabase.from('payments').select('id,child_id,ref_id,type,concept_code,status,due_date').eq('type','academy').order('id').range(from, to)),
        adminReadAll((from, to) => supabase.from('billing_requests').select('*,billing_request_items(*),billing_request_attempts(state,billing_status)').order('id').range(from, to)),
        adminReadAll((from, to) => supabase.from('academy_checkout_contracts').select('membership_id,mode,state,owner_id,choice,billing_status').order('id').range(from, to)),
    ])
    const mode = stripeSalesConfigured() || 'live'
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    const roles = new Map(profiles.data.map(profile => [profile.id, profile.role]))
    const visits = new Map(activity.data.map(visit => [visit.user_id, visit]))
    const emails = new Map<string, number>()
    for (const guardian of guardians.data) {
        const email = guardian.email?.trim().toLowerCase()
        if (email) emails.set(email, (emails.get(email) || 0) + 1)
    }
    const rows: PortalUsageRow[] = guardians.data.map(guardian => {
        const visit = guardian.user_id ? visits.get(guardian.user_id) : null
        const childIds = guardian.children.flatMap(relation => {
            const child = relation.child as unknown as { id: string; archived_at: string | null } | null
            return child && !child.archived_at ? [child.id] : []
        })
        const own = requests.data.filter(r => r.guardian_id === guardian.id && r.mode === mode && r.kind === 'subscription')
        const legacy = contracts.data.filter(c => c.owner_id === guardian.user_id && c.mode === mode && c.choice === 'monthly' && ['creating','open','active'].includes(c.state))
        const available = monthlyCardCandidates(memberships.data.filter(m => childIds.includes(m.child_id)), payments.data, requests.data as BillingRequest[], contracts.data, mode, today, now).length > 0
        const attention = own.some(r => r.billing_request_attempts.some((a: { billing_status: string; state: string }) => a.billing_status === 'attention' && !['expired','cancelled'].includes(a.state))) || legacy.some(c => c.billing_status === 'attention')
        const authorized = own.some(r => r.state === 'active') || legacy.some(c => c.state === 'active')
        const monthlyCardStatus = attention ? 'Revisar cobro de tarjeta' : authorized ? 'Tarjeta autorizada' : own.some(r => r.state === 'processing') || legacy.length ? 'Autorización en curso' : own.some(r => r.state === 'cancelling') ? 'Cancelación en curso' : own.some(r => r.state === 'ready' && Date.parse(r.expires_at) > now) || available ? 'Puede añadir tarjeta desde Pagos' : 'Sin mensualidades disponibles para activar'
        return {
            id: guardian.id, full_name: guardian.full_name, email: guardian.email, user_id: guardian.user_id,
            role: guardian.user_id ? roles.get(guardian.user_id) || null : null,
            players: guardian.children.flatMap(relation => {
                const child = relation.child as unknown as { id: string; full_name: string; archived_at: string | null } | null
                return child && !child.archived_at ? [{ id: child.id, full_name: child.full_name }] : []
            }),
            first_seen_at: visit?.first_seen_at || null, last_seen_at: visit?.last_seen_at || null,
            duplicateEmail: (emails.get(guardian.email?.trim().toLowerCase() || '') || 0) > 1,
            monthlyCardStatus: monthlyCardStatus + (authorized && available ? ' · Otras cuotas sin autorizar' : ''),
        }
    })
    // Registration does not necessarily create/link a CRM guardian yet. Include
    // these Auth accounts in the count without silently creating CRM records.
    const linkedUsers = new Set(guardians.data.map(g => g.user_id).filter(Boolean))
    const unlinked = profiles.data.filter(p => p.role === 'guardian' && !linkedUsers.has(p.id))
    const db = createAdminClient()
    const missingAccounts = await Promise.all(unlinked.map(async profile => {
        const { data, error } = await db.auth.admin.getUserById(profile.id)
        if (error || !data.user) throw Error('No se pudieron comprobar todas las cuentas familiares.')
        const visit = visits.get(profile.id)
        return {
            id: `account-${profile.id}`, full_name: profile.full_name || data.user.email || 'Cuenta familiar', email: data.user.email || null,
            user_id: profile.id, role: 'guardian', players: [], first_seen_at: visit?.first_seen_at || null, last_seen_at: visit?.last_seen_at || null,
            duplicateEmail: false, unlinkedAccount: true, monthlyCardStatus: 'Pendiente de vincular tutor y jugador',
        } satisfies PortalUsageRow
    }))
    rows.push(...missingAccounts)
    rows.sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
    return <FamilyPortalUsage rows={rows} />
}
