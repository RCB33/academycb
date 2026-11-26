import 'server-only'

// Deliberately closed vocabulary: never serialize errors, bodies, URLs, headers,
// emails, credentials or payment payloads. Vercel supplies request correlation.
const levels = {
    'monitoring.ready': 'info',
    'request.failed': 'error',
    'registration.received': 'info',
    'registration.rejected': 'warn',
    'registration.saved': 'info',
    'auth.code_rejected': 'warn',
    'auth.setup_expired': 'warn',
    'auth.password_rejected': 'warn',
    'auth.password_saved': 'info',
    'auth.auto_login_failed': 'warn',
    'auth.unavailable': 'error',
    'email.queue_failed': 'error',
    'email.delivery_failed': 'error',
    'portal.visit_failed': 'error',
    'billing.checkout_failed': 'error',
    'billing.reservation_rejected': 'warn',
    'stripe.configuration_failed': 'error',
    'stripe.confirmation_failed': 'error',
} as const
const sources = ['portal','registration','billing','stripe','admin','public','other','email','invoice','subscription','contract','probe'] as const
type Source = typeof sources[number]
export function operationalLog(event: keyof typeof levels, details: { source?: Source; status?: number; digest?: string } = {}) {
    try {
        if (!Object.hasOwn(levels,event)) return
        const entry: Record<string,string|number> = { tag:'academy_ops', event, level:levels[event], at:new Date().toISOString() }
        const revision=process.env.VERCEL_GIT_COMMIT_SHA
        if(revision && /^[a-f0-9]{40}$/i.test(revision)) entry.release=revision.slice(0,12)
        if(details.source && sources.includes(details.source)) entry.source=details.source
        if(typeof details.status==='number' && Number.isInteger(details.status) && details.status>=100 && details.status<=599) entry.status=details.status
        if(typeof details.digest==='string' && /^\d{1,20}$/.test(details.digest)) entry.digest=details.digest
        console[levels[event]](JSON.stringify(entry))
    } catch { /* Diagnostics must never break the underlying user operation. */ }
}

export function operationalArea(routePattern: string): Source {
    if(routePattern.includes('stripe')) return 'stripe'
    if(routePattern.includes('billing')||routePattern.includes('pago')) return 'billing'
    if(routePattern.includes('portal')||routePattern.includes('auth')) return 'portal'
    if(routePattern.includes('inscripcion')||routePattern.includes('enrollment')) return 'registration'
    if(routePattern.includes('admin')) return 'admin'
    return 'other'
}
