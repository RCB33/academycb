import Link from 'next/link'
import { CreditCard, ShieldCheck } from 'lucide-react'
import { billingParts, billingSummary, type BillingRequest } from '@/lib/billing-request'
import { createTranslator, type Locale } from '@/lib/i18n/translate'

export function monthlyCardRequests(requests: BillingRequest[], mode: 'test' | 'live' | null) {
    return requests.filter(request => request.mode === (mode || 'live')
        && request.kind === 'subscription'
        && ['ready', 'processing', 'active', 'cancelling'].includes(request.state)
        && request.billing_request_items.every(item => item.snapshot.type === 'academy')
        && billingParts(request).recurring.length > 0)
}

export function MonthlyCardOption({ requests, mode, enabled, now, legacyInProgress = false, viewOnly = false, locale = 'es' }: {
    requests: BillingRequest[]
    mode: 'test' | 'live' | null
    enabled: boolean
    now: number
    legacyInProgress?: boolean
    viewOnly?: boolean
    locale?: Locale
}) {
    const t = createTranslator(locale)
    const monthly = monthlyCardRequests(requests, mode)
    const contactUrl = 'https://wa.me/34691179600?text=' + encodeURIComponent(t('Hola, quiero activar el pago mensual de Academia con tarjeta. ¿Podéis revisar mis cuotas y preparar la autorización en el portal?'))
    const button = 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-center text-sm font-bold text-navy transition hover:bg-gold/80 sm:w-auto'
    return <section aria-labelledby="monthly-card-title" className="space-y-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
            <CreditCard className="mt-1 h-6 w-6 shrink-0 text-navy" aria-hidden="true" />
            <div>
                <h2 id="monthly-card-title" className="text-xl font-bold text-navy">{t('Pago mensual con tarjeta')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('Introduce tu tarjeta en Stripe y autoriza el cobro automático de las mensualidades de Academia. Antes de confirmar verás los importes, las fechas y cuándo terminan los cobros.')}</p>
            </div>
        </div>
        {mode === 'test' && <p className="rounded-lg bg-amber-100 p-3 text-sm font-semibold">{t('Entorno de pruebas. Usa únicamente tarjetas de prueba; no se cobra dinero real.')}</p>}
        {!enabled && <p className="rounded-lg bg-white/80 p-3 text-sm text-slate-700">{t('La activación de nuevas mensualidades con tarjeta todavía no está disponible. Puedes revisar tus cuotas o solicitar ayuda a secretaría.')}</p>}
        {monthly.map(request => {
            const expired = request.state === 'ready' && (!Number.isFinite(Date.parse(request.expires_at)) || Date.parse(request.expires_at) <= now)
            const active = request.state === 'active'
            const processing = request.state === 'processing'
            const cancelling = request.state === 'cancelling'
            const initial = billingParts(request).initial.length > 0
            const label = active ? 'Ver mensualidades autorizadas' : processing ? 'Revisar autorización en curso' : cancelling ? 'Ver estado de la cancelación' : expired || !enabled ? 'Ver importes y fechas' : 'Añadir tarjeta y activar mensualidades'
            return <article key={request.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-navy">{request.title}</h3>
                {active && <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4 shrink-0" />{t('Tarjeta autorizada para estas mensualidades')}</p>}
                {processing && <p className="text-sm font-semibold text-amber-800">{t('Tu autorización está en curso. Revisa su estado antes de iniciar otra.')}</p>}
                {cancelling && <p className="text-sm font-semibold text-amber-800">{t('La cancelación está en curso. Contacta con secretaría para cambiar la forma de pago.')}</p>}
                <p className="break-words text-sm leading-relaxed text-slate-600">{billingSummary(request)}</p>
                {request.state === 'ready' && initial && <p className="text-sm font-semibold text-navy">{t('Este enlace incluye un primer pago al completar Stripe. Revisa el desglose antes de autorizarlo.')}</p>}
                {expired && <p className="text-sm text-amber-800">{t('Este enlace ha caducado. Solicita a secretaría que revise tus cuotas y lo renueve.')}</p>}
                <Link href={`/portal/pagos/solicitud/${request.id}`} className={button}>{t(label)}</Link>
                {expired && !viewOnly && <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-navy underline">{t('Solicitar nuevo enlace por WhatsApp')}</a>}
            </article>
        })}
        {monthly.length === 0 && (legacyInProgress
            ? <p className="rounded-xl bg-white p-4 text-sm text-slate-700">{t('Ya tienes un plan de tarjeta autorizado o una autorización en curso. Consulta su estado en esta página; para cambiarlo, contacta con secretaría.')}</p>
            : <div className="space-y-3">
                <p className="text-sm text-slate-700">{t('¿Quieres pasar de efectivo a tarjeta? Secretaría debe preparar primero tus mensualidades. Cuando estén listas, podrás añadir la tarjeta y autorizarlas aquí.')}</p>
                {viewOnly ? <p className="text-sm text-slate-500">{t('Vista de consulta: la autorización debe hacerla la familia desde su cuenta.')}</p> : <a href={contactUrl} target="_blank" rel="noopener noreferrer" className={button}>{t('Solicitar activación por WhatsApp')}</a>}
            </div>)}
        <p className="text-xs leading-relaxed text-slate-500">{t('La tarjeta se introduce en Stripe. Cada recibo se marcará pagado solo cuando se confirme el cobro. Puedes seguir pagando en efectivo si lo prefieres.')}</p>
    </section>
}
