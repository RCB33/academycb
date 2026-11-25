import { z } from 'zod'
import { getTournamentPricing } from '@/lib/tournament-pricing'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const travelTournamentInput = z.object({
    request_id: z.string().uuid(), tournament_id: z.string().uuid(), offer_version: z.string().length(64),
    plan_choice: z.enum(['monthly', 'two']), payment_choice: z.literal('transfer'),
    child_id: z.string().uuid().nullable(), child_name: z.string().trim().min(2).max(120),
    birth_date: date.refine(v => { const d = new Date(v); return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d <= new Date() }, 'Revisa la fecha de nacimiento.'),
    guardian_name: z.string().trim().min(2).max(120), phone: z.string().trim().regex(/^\+?[\d\s()-]{9,20}$/),
    club: z.string().trim().min(2).max(120), position: z.enum(['field', 'keeper']),
    image_consent: z.boolean(), privacy_consent: z.literal(true), terms_consent: z.literal(true), participation_consent: z.literal(true),
    notes: z.string().trim().max(1000), website: z.literal(''),
})
export const travelTournamentDetailsSchema = z.object({
    version: z.literal('travel-2027-v1'), offer_version: z.string().length(64),
    tournament: z.object({ id: z.string().uuid(), title: z.string(), start_date: date, end_date: date, accommodation: z.string(), flight_excluded: z.boolean() }),
    payment_choice: z.literal('transfer'), plan_choice: z.enum(['monthly', 'two']),
    installments_cents: z.array(z.number().int().positive()).min(2).max(7), total_cents: z.number().int().positive(),
    club: z.string(), position: z.enum(['field', 'keeper']), image_consent: z.boolean(),
}).refine(v => v.installments_cents.reduce((a, b) => a + b, 0) === v.total_cents, 'Las cuotas no coinciden con el total.')
export type TravelTournamentDetails = z.infer<typeof travelTournamentDetailsSchema>
export type TravelTournamentOffer = { id: string; title: string; start_date: string; end_date: string; price: number; version: string }

export function travelTournamentSnapshot(offer: TravelTournamentOffer, input: z.infer<typeof travelTournamentInput>): TravelTournamentDetails {
    const pricing = getTournamentPricing(offer.id, offer.price)
    if (!pricing || input.tournament_id !== offer.id || input.offer_version !== offer.version) throw new Error('Los precios o fechas han cambiado. Recarga y revisa la solicitud antes de enviarla.')
    const installments = [...(input.plan_choice === 'two' ? pricing.twoPaymentsCents : pricing.monthlyCents)]
    return travelTournamentDetailsSchema.parse({ version: 'travel-2027-v1', offer_version: offer.version,
        tournament: { id: offer.id, title: offer.title, start_date: offer.start_date, end_date: offer.end_date, accommodation: pricing.accommodation, flight_excluded: pricing.flightExcluded },
        payment_choice: 'transfer', plan_choice: input.plan_choice, installments_cents: installments, total_cents: installments.reduce((a, b) => a + b, 0),
        club: input.club, position: input.position, image_consent: input.image_consent,
    })
}

export function travelTournamentSummary(value: TravelTournamentDetails) {
    const d = travelTournamentDetailsSchema.parse(value)
    const money = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
    const first = d.installments_cents[0], last = d.installments_cents[d.installments_cents.length - 1]
    const schedule = first === last ? `${d.installments_cents.length} × ${money(first)}` : `${d.installments_cents.length - 1} × ${money(first)} + última cuota de ${money(last)}`
    return `${d.tournament.title} · ${d.tournament.start_date} – ${d.tournament.end_date}\nAlojamiento: ${d.tournament.accommodation}\n${d.plan_choice === 'monthly' ? 'Mensualidades' : 'Dos pagos'}: ${schedule}\nTotal: ${money(d.total_cents)}${d.tournament.flight_excluded ? ' + vuelo (no incluido)' : ''}\nForma de pago: transferencia bancaria. Administración acordará los vencimientos contigo.`
}
