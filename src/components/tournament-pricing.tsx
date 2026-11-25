import { getTournamentPricing } from '@/lib/tournament-pricing'
import { createTranslator, parseLocale } from '@/lib/i18n/translate'

export function TournamentPricing({ id, price, locale, light = false }: {
    id: string; price: number | string; locale: string; light?: boolean
}) {
    const plan = getTournamentPricing(id, price)
    if (!plan) return null
    const t = createTranslator(parseLocale(locale.split('-')[0]))
    const money = (cents: number) => new Intl.NumberFormat(locale, {
        style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0,
    }).format(cents / 100)
    const months = plan.monthlyCents.length
    const regular = plan.monthlyCents[0]
    const last = plan.monthlyCents[months - 1]
    const twoTotal = plan.twoPaymentsCents.reduce((sum, cents) => sum + cents, 0)
    const saving = plan.totalCents - twoTotal
    return <section aria-label={t('Modalidades de pago')} className={`mt-5 rounded-2xl border p-4 ${light ? 'border-navy/20 bg-white/35 text-navy' : 'border-gold/30 bg-gold/10 text-white'}`}>
        <p className="text-sm font-semibold">{t(plan.accommodation)}</p>
        <p className={`mt-4 text-4xl font-black ${light ? 'text-navy' : 'text-gold'}`}>{money(regular)}<span className="ml-1 text-sm font-semibold">{t('/ mes')}</span></p>
        <p className="mt-2 text-sm font-semibold">{t(`${months} mensualidades`)}</p>
        <p className="mt-1 text-sm">{regular === last
            ? `${months} × ${money(regular)}`
            : <>{months - 1} × {money(regular)} + {t('última cuota de')} {money(last)}</>}</p>
        <p className="mt-3 font-bold">{t('Precio total')}: {money(plan.totalCents)}{plan.flightExcluded && <> + {t('vuelo')}</>}</p>
        <div className={`mt-4 border-t pt-4 text-sm ${light ? 'border-navy/20' : 'border-white/20'}`}>
            <p className="font-bold">{t('En 2 pagos')}: 2 × {money(plan.twoPaymentsCents[0])}</p>
            {saving > 0 && <p className="mt-1">{money(twoTotal)} {t('en total')}. {t('Ahorro')}: {money(saving)}.</p>}
        </div>
        {plan.flightExcluded && <p className="mt-3 text-xs leading-relaxed">{t('Vuelo no incluido. Seguro de cancelación y devolución opcional; consulta precio y condiciones.')}</p>}
    </section>
}
