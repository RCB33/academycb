'use client'

import { useActionState, useMemo, useState, type ComponentProps } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { submitEnrollment, enrollmentInitialState } from '@/app/actions/enrollment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type EnrollmentService = 'academy' | 'campus' | 'tournament'
export type EnrollmentActivity = { id: string; name: string; detail: string }

const serviceLabels: Record<EnrollmentService, string> = {
    academy: 'Academia anual',
    campus: 'Campus',
    tournament: 'Torneo',
}

export default function EnrollmentForm({
    campuses,
    tournaments,
    initialService,
    initialActivityId,
}: {
    campuses: EnrollmentActivity[]
    tournaments: EnrollmentActivity[]
    initialService: EnrollmentService
    initialActivityId: string
}) {
    const [state, action, pending] = useActionState(submitEnrollment, enrollmentInitialState)
    const [service, setService] = useState<EnrollmentService>(initialService)
    const [activityId, setActivityId] = useState(initialActivityId)
    const activities = useMemo(() => service === 'campus' ? campuses : service === 'tournament' ? tournaments : [], [campuses, service, tournaments])

    if (state.success) {
        return <section className="mx-auto max-w-2xl rounded-3xl border border-green-200 bg-white p-10 text-center shadow-2xl shadow-navy/15" role="status"><CheckCircle2 className="mx-auto h-14 w-14 text-green-600" /><h2 className="mt-5 font-heading text-3xl font-black uppercase text-navy">Solicitud recibida</h2><p className="mt-3 text-slate-600">{state.message}</p><Button asChild className="mt-7 bg-gold font-bold text-navy hover:bg-gold/80"><Link href="/">Volver a la web</Link></Button></section>
    }

    return (
        <form action={action} className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-navy/15 md:p-10">
            <section>
                <p className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Tu inscripción</p>
                <h2 className="mt-1 font-heading text-3xl font-black uppercase text-navy">1. ¿Qué quieres solicitar?</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {(Object.keys(serviceLabels) as EnrollmentService[]).map((item) => <label key={item} className={`cursor-pointer rounded-xl border p-4 transition ${service === item ? 'border-gold bg-gold/10 ring-1 ring-gold shadow-sm' : 'border-slate-200 hover:border-gold/60 hover:bg-slate-50'}`}><input className="sr-only" type="radio" name="service" value={item} checked={service === item} onChange={() => { setService(item); setActivityId('') }} /><span className="block font-bold text-navy">{serviceLabels[item]}</span><span className="mt-1 block text-xs text-slate-500">{item === 'academy' ? 'Temporada deportiva' : item === 'campus' ? 'Edición intensiva' : 'Competición o evento'}</span></label>)}
                </div>
                {service !== 'academy' && <div className="mt-5"><label htmlFor="activity_id" className="text-sm font-bold text-slate-700">{service === 'campus' ? 'Campus seleccionado' : 'Torneo seleccionado'}</label><select id="activity_id" name="activity_id" value={activityId} onChange={(event) => setActivityId(event.target.value)} required className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"><option value="">Selecciona una actividad</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name} · {activity.detail}</option>)}</select>{activities.length === 0 && <p className="mt-2 text-sm text-amber-700">Ahora mismo no hay convocatorias publicadas. Puedes contactar con la academia para recibir información.</p>}</div>}
            </section>

            <section className="border-t border-slate-200 pt-8">
                <h2 className="font-heading text-2xl font-black text-navy">2. Datos del jugador</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2"><Field label="Nombre completo del jugador" name="child_name" required autoComplete="name" /><Field label="Fecha de nacimiento" name="birth_date" type="date" required /></div>
            </section>

            <section className="border-t border-slate-200 pt-8">
                <h2 className="font-heading text-2xl font-black text-navy">3. Datos del tutor/a</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2"><Field label="Nombre completo" name="guardian_name" required autoComplete="name" /><Field label="Email" name="email" type="email" required autoComplete="email" /><Field label="Teléfono" name="phone" type="tel" required autoComplete="tel" placeholder="600 000 000" /><div><label htmlFor="notes" className="text-sm font-bold text-slate-700">Observaciones (opcional)</label><Textarea id="notes" name="notes" maxLength={1000} className="mt-2 min-h-24 border-slate-300" placeholder="Por ejemplo: disponibilidad, dudas o información que debamos conocer." /></div></div>
            </section>

            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4" /><span>Autorizo el tratamiento de estos datos para gestionar esta solicitud, según la <Link href="/privacidad" className="font-semibold text-navy underline">política de privacidad</Link>.</span></label>
            {state.error && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">{state.error}</p>}
            <Button disabled={pending || (service !== 'academy' && activities.length === 0)} className="h-12 w-full bg-gold text-base font-black text-navy shadow-lg shadow-gold/20 hover:bg-gold/80">{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando solicitud…</> : <><Send className="mr-2 h-4 w-4" /> Enviar solicitud de inscripción</>}</Button>
            <p className="text-center text-xs text-slate-500">Enviar esta solicitud no crea un cargo ni confirma una plaza automáticamente.</p>
        </form>
    )
}

function Field({ label, ...props }: ComponentProps<typeof Input> & { label: string }) {
    const id = props.name || label
    return <div><label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label><Input id={id} {...props} className="mt-2 h-11 border-slate-300" /></div>
}
