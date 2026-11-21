// Secondary screens belong to their main workspace in both navigation layouts.
const secondarySections: Record<string, string[]> = {
    '/admin/crm/alumnos': ['/admin/crm/tutores'],
    '/admin/solicitudes': ['/admin/leads'],
    '/admin/ajustes': ['/admin/stripe'],
}
export function isActiveAdminSection(pathname: string, href: string) {
    return [href, ...(secondarySections[href] || [])].some(path => pathname === path || pathname.startsWith(`${path}/`))
}
