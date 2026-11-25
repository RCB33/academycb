import 'server-only'
import { cache } from 'react'
import { getPortalViewer } from '@/lib/admin-view'
import { createAdminClient } from '@/lib/supabase/admin'

export type FamilyOnboardingState = 'start' | 'pending' | 'review' | 'verify'

// Called only when the portal has no active player. No accounts or records are created.
// Identity comes from Auth (or the existing admin preview), never a form/query string.
export const getFamilyOnboardingState = cache(async (): Promise<FamilyOnboardingState> => {
    const { user } = await getPortalViewer()
    if (!user?.email_confirmed_at || !user.email) return 'verify'
    const db = createAdminClient()
    const email = user.email.trim().replace(/[\\%_]/g, '\\$&')
    const results = await Promise.all([
        db.from('enrollment_requests').select('status').eq('submitted_by', user.id),
        // Anonymous Academy requests can predate the verified account. Read only status.
        db.from('enrollment_requests').select('status').ilike('email', email),
        db.from('event_registrations').select('status').eq('user_id', user.id),
    ])
    if (results.some(result => result.error)) throw new Error('No se pudo comprobar el estado de tu inscripción. Vuelve a intentarlo.')
    const statuses = results.flatMap(result => (result.data || []).map(row => row.status))
    // An accepted but unlinked/archived player needs review, not another application.
    if (statuses.some(status => ['enrolled', 'approved', 'paid', 'confirmed', 'awaiting_payment', 'proof_review'].includes(status))) return 'review'
    if (statuses.some(status => ['new', 'contacted', 'interested', 'pending', 'requested'].includes(status))) return 'pending'
    return statuses.length ? 'review' : 'start'
})
