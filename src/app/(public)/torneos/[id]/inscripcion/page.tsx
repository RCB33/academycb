import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTravelTournamentOffer } from '@/lib/travel-tournament-server'
import { getFamilyContext } from '@/lib/family-context'
import { EventAccess } from '../../inscripcion/access'
import { TravelTournamentForm } from './registration-form'
import { TournamentPricing } from '@/components/tournament-pricing'
import { getT } from '@/lib/i18n/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function TravelTournamentRegistration({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
    const offer = await getTravelTournamentOffer(id)
    const t = await getT()
    if (!offer) return <main className="mx-auto max-w-2xl space-y-5 px-5 py-16"><h1 className="text-3xl font-black">{t('Inscripción no disponible')}</h1><p>{t('Consulta las convocatorias abiertas o contacta con Academy.')}</p><Link className="underline" href="/torneos">{t('Ver torneos')}</Link></main>
    const family = await getFamilyContext()
    // Own submissions only. This page is outside the private portal so pending families can consult it.
    const result = family ? await createAdminClient().from('enrollment_requests').select('id,child_name,status').eq('submitted_by', family.userId).eq('activity_id', id).neq('status', 'lost').order('created_at', { ascending: false }) : { data: [], error: null }
    if (result.error) throw new Error('No se pudieron consultar tus solicitudes. Inténtalo de nuevo.')
    return <main className="min-h-screen bg-slate-50 px-4 py-12 text-navy"><div className="mx-auto max-w-3xl">
        <Link href={`/torneos/${id}`} className="text-sm underline">{t('Volver a la ficha del torneo')}</Link>
        <h1 className="mt-6 text-3xl font-black">{t('Solicitar plaza')} · {offer.title}</h1>
        <p className="mt-3">{offer.start_date} – {offer.end_date}</p>
        <div className="rounded-2xl bg-gold"><TournamentPricing id={id} price={offer.price} locale={t.locale} light /></div>
        <p className="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{t('La solicitud queda pendiente de revisión. Pagarás por transferencia después de la aceptación y de acordar las fechas con administración.')}</p>
        {!!result.data?.length && <section className="my-6 rounded-xl border bg-white p-5"><h2 className="font-bold">{t('Tus solicitudes para este torneo')}</h2>{result.data.map(r => <p key={r.id} className="mt-2">{r.child_name} · {t(r.status === 'enrolled' ? 'Plaza aceptada · pago por transferencia' : 'Pendiente de revisión')} · {r.id.slice(0, 8).toUpperCase()}</p>)}</section>}
        {family ? <TravelTournamentForm offer={offer} family={family} /> : <EventAccess returnTo={`/torneos/${id}/inscripcion`} />}
    </div></main>
}
