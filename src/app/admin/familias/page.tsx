import { requireAdmin } from '@/lib/auth'
import { adminReadAll } from '@/lib/admin-read-all'
import type { PortalUsageRow } from '@/lib/portal-usage'
import { FamilyPortalUsage } from '@/components/admin/family-portal-usage'

export default async function FamilyPortalUsagePage() {
    const { supabase } = await requireAdmin()
    const [guardians, profiles, activity] = await Promise.all([
        adminReadAll((from, to) => supabase.from('guardians').select('id,full_name,email,user_id,children:child_guardians(child:children(id,full_name,archived_at))').order('id').range(from, to)),
        adminReadAll((from, to) => supabase.from('profiles').select('id,role').order('id').range(from, to)),
        adminReadAll((from, to) => supabase.from('guardian_portal_activity').select('user_id,first_seen_at,last_seen_at').order('user_id').range(from, to)),
    ])
    const roles = new Map(profiles.data.map(profile => [profile.id, profile.role]))
    const visits = new Map(activity.data.map(visit => [visit.user_id, visit]))
    const emails = new Map<string, number>()
    for (const guardian of guardians.data) {
        const email = guardian.email?.trim().toLowerCase()
        if (email) emails.set(email, (emails.get(email) || 0) + 1)
    }
    const rows: PortalUsageRow[] = guardians.data.map(guardian => {
        const visit = guardian.user_id ? visits.get(guardian.user_id) : null
        return {
            id: guardian.id, full_name: guardian.full_name, email: guardian.email, user_id: guardian.user_id,
            role: guardian.user_id ? roles.get(guardian.user_id) || null : null,
            players: guardian.children.flatMap(relation => {
                const child = relation.child as unknown as { id: string; full_name: string; archived_at: string | null } | null
                return child && !child.archived_at ? [{ id: child.id, full_name: child.full_name }] : []
            }),
            first_seen_at: visit?.first_seen_at || null, last_seen_at: visit?.last_seen_at || null,
            duplicateEmail: (emails.get(guardian.email?.trim().toLowerCase() || '') || 0) > 1,
        }
    }).sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
    return <FamilyPortalUsage rows={rows} />
}
