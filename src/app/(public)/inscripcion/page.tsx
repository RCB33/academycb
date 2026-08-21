import { CalendarDays, ClipboardCheck, Clock3, ExternalLink, FileText, MapPin, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import EnrollmentForm, { type EnrollmentActivity, type EnrollmentService } from './enrollment-form'

type SearchParams = Promise<{ service?: string; activity?: string }>

function parseService(value: string | undefined): EnrollmentService {
    return value === 'campus' || value === 'tournament' ? value : 'academy'
}

export const metadata = {
    title: 'Inscripción',
    description: 'Solicita plaza en Academy Costa Brava.',
}

export default async function InscripcionPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    const [{ data: campusRows }, { data: tournamentRows }] = await Promise.all([
        supabase.from('campuses').select('id, name, start_date, end_date, price').eq('status', 'published').gte('end_date', today).order('start_date'),
        supabase.from('tournaments_internal').select('id, title, start_date, end_date, price').eq('status', 'open').or(`end_date.is.null,end_date.gte.${today}`).order('start_date'),
    ])

    const campuses: EnrollmentActivity[] = (campusRows || []).map((campus) => ({
        id: campus.id,
        name: campus.name,
        detail: `${new Date(campus.start_date).toLocaleDateString('es-ES')} – ${new Date(campus.end_date).toLocaleDateString('es-ES')}${campus.price !== null ? ` · ${Number(campus.price).toFixed(2)} €` : ''}`,
    }))
    const tournaments: EnrollmentActivity[] = (tournamentRows || []).map((tournament) => ({
        id: tournament.id,
        name: tournament.title,
        detail: `${tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('es-ES') : 'Fecha por confirmar'}${tournament.end_date ? ` – ${new Date(tournament.end_date).toLocaleDateString('es-ES')}` : ''}${Number(tournament.price) > 0 ? ` · ${Number(tournament.price).toFixed(2)} €` : ''}`,
    }))

    return (
        <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-900">
            <section className="relative overflow-hidden bg-navy pb-28 pt-16 md:pb-36 md:pt-24">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(212,175,55,0.34),transparent_42%),linear-gradient(135deg,#0C2241_0%,#0C2241_54%,#163a6b_100%)]" />
                <div className="absolute -right-28 top-8 h-72 w-72 rounded-full border border-gold/20" />
                <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full border border-white/10" />

                <div className="container relative z-10 max-w-5xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-sm font-bold text-gold backdrop-blur-sm"><ClipboardCheck className="h-4 w-4" /> INSCRIPCIONES ACADEMY</span>
                        <h1 className="mt-6 font-heading text-5xl font-black uppercase leading-[0.9] tracking-tight text-white md:text-7xl">Reserva <span className="text-gold">tu plaza</span></h1>
                        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-200 md:text-lg">Da el primer paso. Envía los datos básicos y secretaría confirmará disponibilidad, condiciones y siguientes pasos. <span className="font-semibold text-white">No se realiza ningún cargo ahora.</span></p>
                    </div>

                    <div className="mt-12 grid gap-4 md:grid-cols-3">
                        <Info icon={<ClipboardCheck className="h-5 w-5" />} title="Sin pago ahora" text="Enviar la solicitud no genera ningún cargo ni compromiso." />
                        <Info icon={<CalendarDays className="h-5 w-5" />} title="Atención personal" text="Secretaría te orienta sobre grupo, horario y disponibilidad." />
                        <Info icon={<ShieldCheck className="h-5 w-5" />} title="Plaza confirmada" text="Solo formalizamos la inscripción cuando la plaza está validada." />
                    </div>
                </div>
            </section>

            <div className="container relative z-10 -mt-14 max-w-5xl pb-16 md:-mt-20 md:pb-24">
                <AcademyEnrollmentInfo />
                <EnrollmentForm
                    campuses={campuses}
                    tournaments={tournaments}
                    initialService={parseService(params.service)}
                    initialActivityId={params.activity || ''}
                />
            </div>
        </div>
    )
}

function AcademyEnrollmentInfo() {
    const plans = [
        { title: 'Una sesión semanal', price: '75 €', suffix: '/ mes', detail: 'Una sesión de entrenamiento por semana.' },
        { title: 'Dos sesiones semanales', price: '140 €', suffix: '/ mes', detail: 'Una sesión de lunes a viernes y otra el domingo.', featured: true },
        { title: 'Matrícula de inscripción', price: '30 €', suffix: ' pago único', detail: 'Solo al formalizar la inscripción de un nuevo jugador.' },
    ]

    return (
        <section className="mb-8 rounded-3xl border border-white/15 bg-navy p-6 text-white shadow-2xl shadow-navy/20 md:mb-10 md:p-10" aria-labelledby="academy-enrollment-title">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Información Academy</p>
                    <h2 id="academy-enrollment-title" className="mt-2 font-heading text-4xl font-black uppercase leading-none md:text-5xl">Precios, horarios y <span className="text-gold">dossier</span></h2>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">Consulta todo antes de reservar. Los grupos se organizan por edad y nivel; secretaría confirma el grupo y horario definitivo.</p>
                </div>
                <a href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gold/45 bg-gold/10 px-5 text-sm font-bold text-gold transition hover:bg-gold hover:text-navy"><FileText className="mr-2 h-4 w-4" /> Ver dossier PDF <ExternalLink className="ml-2 h-4 w-4" /></a>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
                {plans.map((plan) => (
                    <article key={plan.title} className={`rounded-2xl border p-5 ${plan.featured ? 'border-gold bg-gold text-navy' : 'border-white/15 bg-white/5'}`}>
                        <CalendarDays className={`h-5 w-5 ${plan.featured ? 'text-navy' : 'text-gold'}`} />
                        <h3 className="mt-3 font-heading text-2xl font-bold uppercase">{plan.title}</h3>
                        <p className={`mt-2 min-h-10 text-xs leading-relaxed ${plan.featured ? 'text-navy/80' : 'text-slate-300'}`}>{plan.detail}</p>
                        <p className="mt-4 border-t border-current/20 pt-3"><span className="font-heading text-4xl font-black">{plan.price}</span><span className="ml-1 text-xs font-bold uppercase">{plan.suffix}</span></p>
                    </article>
                ))}
            </div>

            <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
                <div className="flex gap-3 rounded-xl bg-black/15 p-4"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="leading-relaxed text-slate-300"><strong className="block text-white">Sesiones de grupos</strong>Martes a viernes, con sesiones de domingo según grupo.</p></div>
                <div className="flex gap-3 rounded-xl bg-black/15 p-4"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="leading-relaxed text-slate-300"><strong className="block text-white">Tecnificación de porteros</strong>Martes y miércoles en Santa Cristina d&apos;Aro. Consulta todos los horarios en el dossier.</p></div>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">Plan Plus: suplemento de 50 € con recuperación de sesiones y beneficios Academy. Consulta sus condiciones en el dossier.</p>
        </section>
    )
}

function Info({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
    return <div className="rounded-2xl border border-white/15 bg-white/8 p-5 text-left shadow-lg shadow-navy/15 backdrop-blur-sm"><div className="mb-3 text-gold">{icon}</div><h2 className="font-bold text-white">{title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p></div>
}
