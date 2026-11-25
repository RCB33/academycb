import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAppRole } from '@/lib/roles'

// Invitations may not yet have a verified email. The account must already have
// an assigned staff role or a real tutor-player link; this function never provisions either.
export async function portalAccountEligible(db: SupabaseClient, user: User): Promise<boolean> {
    if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) return false
    const [profile, workers] = await Promise.all([
        db.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        db.from('workers').select('access_enabled').eq('user_id', user.id),
    ])
    if (profile.error || workers.error) throw new Error('Portal access lookup failed')
    if (!isAppRole(profile.data?.role) || workers.data?.some(w => w.access_enabled !== true)) return false
    if (profile.data.role !== 'guardian') return true
    const family = await db.from('guardians').select('id,child_guardians!inner(child_id)').eq('user_id', user.id).limit(1)
    if (family.error) throw new Error('Family access lookup failed')
    return Boolean(family.data?.length)
}

export async function eligiblePortalCodeEmail(email: string): Promise<string | null> {
    const db = createAdminClient()
    const normalized = email.trim().toLowerCase()
    const pattern = normalized.replace(/[\\%_]/g, '\\$&')
    const [guardians, staff] = await Promise.all([
        db.from('guardians').select('user_id,child_guardians!inner(child_id)').ilike('email', pattern).not('user_id', 'is', null),
        // Legacy administrators need not have a worker record. Only trusted profile
        // roles are candidates; user_metadata is never used for authorization.
        db.from('profiles').select('id').in('role', ['admin', 'coach', 'staff', 'finance', 'marketing']),
    ])
    if (guardians.error || staff.error) throw new Error('Portal account lookup failed')
    const ids = [...new Set([...(guardians.data || []).map(g => g.user_id), ...(staff.data || []).map(p => p.id)])]
    for (const id of ids) {
        if (!id) continue
        const { data, error } = await db.auth.admin.getUserById(id)
        if (error) throw new Error('Portal identity lookup failed')
        const user = data.user
        if (user?.email?.trim().toLowerCase() === normalized && await portalAccountEligible(db, user)) return user.email
    }
    return null
}
