import { createAdminClient } from '@/lib/supabase/admin'

export type AccessActivationStatus = {
    accountCreated: boolean
    invitationSent: boolean
    emailConfirmed: boolean
    passwordCreated: boolean
    firstAccessCompleted: boolean
    invitedAt: string | null
    completedAt: string | null
    blocked?: boolean
}

export async function getAccessActivationStatuses(userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))]
    const statuses = new Map<string, AccessActivationStatus>()
    if (uniqueIds.length === 0) return statuses

    const supabaseAdmin = createAdminClient()
    // Look up only requested accounts; pagination must not hide users after #1000.
    for (const id of uniqueIds) {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(id)
        if (error || !data.user) continue
        const user = data.user
        const passwordCreated = user.user_metadata?.password_set === true
        statuses.set(user.id, {
            accountCreated: true,
            invitationSent: Boolean(user.invited_at),
            emailConfirmed: Boolean(user.email_confirmed_at),
            passwordCreated,
            firstAccessCompleted: passwordCreated && Boolean(user.last_sign_in_at),
            invitedAt: user.invited_at || null,
            completedAt: passwordCreated ? user.last_sign_in_at || user.updated_at || null : null,
            blocked: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()),
        })
    }

    return statuses
}
