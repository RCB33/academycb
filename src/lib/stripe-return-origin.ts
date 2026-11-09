// Exact project-owned preview alias: never accept arbitrary *.vercel.app hosts.
export const STRIPE_PREVIEW_HOST = 'academycb-git-feat-stripe-previ-bc1b74-roques-projects-bd4f7acb.vercel.app'

export function stripeReturnBase(origin: string | null, deploymentHost?: string) {
    return `${stripePaymentOrigin(origin, 'test', deploymentHost)}/admin/stripe`
}

export function stripePaymentOrigin(origin: string | null, mode: 'test' | 'live', deploymentHost?: string) {
    if (!origin) throw new Error('No se reconoce el origen de la prueba. Recarga esta página.')
    const url = new URL(origin)
    const allowed = new Set(mode === 'live' ? ['www.academycostabrava.com', 'academycostabrava.com'] : [STRIPE_PREVIEW_HOST])
    if (mode === 'test' && deploymentHost && /^[a-z0-9-]+\.vercel\.app$/.test(deploymentHost)) allowed.add(deploymentHost)
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !allowed.has(url.hostname) || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('El dominio de retorno de esta prueba no está autorizado.')
    }
    return url.origin
}
