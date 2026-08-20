import { CalendarDays, ClipboardCheck, ShieldCheck } from 'lucide-react'
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
                        <Info icon={<ClipboardCheck className="h-5 w-5" />} title="Solicitud estructurada" text="Identificamos la solicitud por servicio y actividad." />
                        <Info icon={<CalendarDays className="h-5 w-5" />} title="Confirmación personal" text="Secretaría valida la plaza antes de cualquier pago." />
                        <Info icon={<ShieldCheck className="h-5 w-5" />} title="Datos protegidos" text="Pedimos solo los datos necesarios para atenderte." />
                    </div>
                </div>
            </section>

            <div className="container relative z-10 -mt-14 max-w-5xl pb-16 md:-mt-20 md:pb-24">
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

function Info({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
    return <div className="rounded-2xl border border-white/15 bg-white/8 p-5 text-left shadow-lg shadow-navy/15 backdrop-blur-sm"><div className="mb-3 text-gold">{icon}</div><h2 className="font-bold text-white">{title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p></div>
}
