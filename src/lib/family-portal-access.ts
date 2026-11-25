import type { SupabaseClient, User } from '@supabase/supabase-js'

// Reuse the real tutor-player relationship, including historical players so that
// registered families can still consult their receipts. Email verification alone is insufficient.
export async function hasFamilyPortalAccess(db: SupabaseClient, user: Pick<User, 'id' | 'email_confirmed_at'>): Promise<boolean> {
    if (!user.email_confirmed_at) return false
    const { data, error } = await db.from('guardians').select('id,child_guardians!inner(child_id)').eq('user_id', user.id).limit(1)
    if (error) throw new Error('No se pudo comprobar el acceso familiar.')
    return Boolean(data?.length)
}
