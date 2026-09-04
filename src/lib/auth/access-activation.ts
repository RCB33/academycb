import { createAdminClient } from '@/lib/supabase/admin'

export type AccessActivationStatus = {
    accountCreated: boolean
    invitationSent: boolean
    emailConfirmed: boolean
    passwordCreated: boolean
    firstAccessCompleted: boolean
    invitedAt: string | null
    completedAt: string | null
}

export async function getAccessActivationStatuses(userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))]
    const statuses = new Map<string, AccessActivationStatus>()
    if (uniqueIds.length === 0) return statuses

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) {
        console.error('Could not load account activation statuses:', error)
        return statuses
    }

    const requestedIds = new Set(uniqueIds)
    for (const user of data.users) {
        if (!requestedIds.has(user.id)) continue
        const passwordCreated = user.user_metadata?.password_set === true
        statuses.set(user.id, {
            accountCreated: true,
            invitationSent: Boolean(user.invited_at),
            emailConfirmed: Boolean(user.email_confirmed_at),
            passwordCreated,
            firstAccessCompleted: passwordCreated && Boolean(user.last_sign_in_at),
            invitedAt: user.invited_at || null,
            completedAt: passwordCreated ? user.last_sign_in_at || user.updated_at || null : null,
        })
    }

    return statuses
}
