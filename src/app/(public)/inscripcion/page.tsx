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
        <div className="min-h-screen bg-slate-50 py-12 text-slate-900 md:py-20">
            <div className="container max-w-5xl">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2 text-sm font-bold text-navy"><ClipboardCheck className="h-4 w-4" /> Solicitud de inscripción</span>
                    <h1 className="mt-5 font-heading text-4xl font-black uppercase text-navy md:text-6xl">Reserva tu plaza</h1>
                    <p className="mt-5 text-lg text-slate-600">Envía los datos básicos y secretaría confirmará disponibilidad, condiciones y siguientes pasos. No se realiza ningún cargo en este momento.</p>
                </div>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    <Info icon={<ClipboardCheck className="h-5 w-5" />} title="Solicitud estructurada" text="La solicitud queda identificada por servicio y actividad." />
                    <Info icon={<CalendarDays className="h-5 w-5" />} title="Plaza confirmada por secretaría" text="La inscripción final se valida antes de asignar plaza o realizar pagos." />
                    <Info icon={<ShieldCheck className="h-5 w-5" />} title="Datos protegidos" text="Solo se solicitan los datos necesarios para tramitar tu petición." />
                </div>
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
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 text-gold">{icon}</div><h2 className="font-bold text-navy">{title}</h2><p className="mt-1 text-sm text-slate-600">{text}</p></div>
}
