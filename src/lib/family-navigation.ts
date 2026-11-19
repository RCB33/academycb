export const FAMILY_NAVIGATION = [
    { href: '/portal/dashboard', label: 'Inicio', icon: 'home', group: 'Tu día a día', primary: true },
    { href: '/portal/calendario', label: 'Calendario', icon: 'calendar', group: 'Tu día a día', primary: true },
    { href: '/portal/pagos', label: 'Pagos', icon: 'payments', group: 'Tu día a día', primary: true },
    { href: '/portal/comunicados', label: 'Avisos', icon: 'messages', group: 'Tu día a día', primary: true },
    { href: '/portal/torneos', label: 'Mis torneos', icon: 'trophy', group: 'Tu día a día', primary: false },
    { href: '/portal/documentos', label: 'Documentos', icon: 'documents', group: 'Tu familia', primary: false },
    { href: '/portal/descargas', label: 'Descargas', icon: 'downloads', group: 'Tu familia', primary: false },
    { href: '/portal/profile', label: 'Mi perfil', icon: 'user', group: 'Tu familia', primary: false },
    { href: '/portal/ayuda', label: 'Ayuda y contacto', icon: 'help', group: 'Tu familia', primary: false },
    { href: '/portal/muro', label: 'Muro Academy', icon: 'heart', group: 'Más de Academy', primary: false },
    { href: '/portal/videoteca', label: 'Vídeos', icon: 'video', group: 'Más de Academy', primary: false },
    { href: '/portal/tienda', label: 'Tienda', icon: 'store', group: 'Más de Academy', primary: false },
] as const

export function isFamilyRouteCurrent(pathname: string, href: string) {
    if (href === '/portal/dashboard' && /^\/portal\/[0-9a-f-]{36}$/i.test(pathname)) return true
    return pathname === href || pathname.startsWith(`${href}/`)
}
