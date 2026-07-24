export const APP_ROLES = ['admin', 'staff', 'finance', 'marketing', 'guardian', 'coach'] as const

export type AppRole = (typeof APP_ROLES)[number]
export type WorkerAccessRole = Exclude<AppRole, 'admin' | 'guardian'>

export const WORKER_ACCESS_ROLES: Array<{
    value: WorkerAccessRole
    label: string
    description: string
}> = [
    { value: 'coach', label: 'Entrenador', description: 'Ve sus sesiones, equipos y controles de asistencia.' },
    { value: 'staff', label: 'Coordinación', description: 'Gestiona el calendario general y la operativa diaria.' },
    { value: 'finance', label: 'Finanzas', description: 'Accede exclusivamente al control económico.' },
    { value: 'marketing', label: 'Marketing', description: 'Gestiona solicitudes web y contactos comerciales.' },
]

export function isAppRole(value: unknown): value is AppRole {
    return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
}

export function getRoleHome(role: AppRole | null | undefined) {
    switch (role) {
        case 'admin':
            return '/admin/dashboard'
        case 'staff':
            return '/admin/calendario'
        case 'finance':
            return '/admin/finanzas'
        case 'marketing':
            return '/admin/leads'
        case 'coach':
            return '/coach'
        default:
            return '/portal/dashboard'
    }
}

export function canAccessAdminPath(role: AppRole | null | undefined, pathname: string) {
    if (role === 'admin') return true
    if (role === 'staff') return pathname === '/admin/calendario' || pathname.startsWith('/admin/calendario/')
    if (role === 'finance') return pathname === '/admin/finanzas' || pathname.startsWith('/admin/finanzas/')
    if (role === 'marketing') return pathname === '/admin/leads' || pathname.startsWith('/admin/leads/')
    return false
}

export function getRoleLabel(role: AppRole | null | undefined) {
    switch (role) {
        case 'admin': return 'Administrador'
        case 'staff': return 'Coordinación'
        case 'finance': return 'Finanzas'
        case 'marketing': return 'Marketing'
        case 'coach': return 'Entrenador'
        default: return 'Familia'
    }
}
