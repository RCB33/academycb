import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type AppRole = 'admin' | 'staff' | 'finance' | 'marketing' | 'guardian' | 'coach'

export async function requireUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error('No autorizado')
    }

    return { supabase, user }
}

export async function requireRole(allowedRoles: AppRole[]) {
    const { supabase, user } = await requireUser()
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (error || !profile?.role || !allowedRoles.includes(profile.role as AppRole)) {
        throw new Error('No tienes permisos para realizar esta acción')
    }

    return { supabase, user, role: profile.role as AppRole }
}

export function requireAdmin() {
    return requireRole(['admin'])
}

export function requireAcademyStaff() {
    return requireRole(['admin', 'staff', 'coach'])
}

export function requireCalendarAccess() {
    return requireRole(['admin', 'staff'])
}

export function requireFinanceAccess() {
    return requireRole(['admin', 'finance'])
}
