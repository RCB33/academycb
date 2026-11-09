'use client'
import { useT } from '@/lib/i18n/client'


import { useMemo, useState, type ComponentProps, type FormEvent } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type EnrollmentService = 'academy' | 'campus' | 'tournament'
export type EnrollmentActivity = { id: string; name: string; detail: string }
type FamilyPlayer = { id: string; full_name: string; birth_date: string | null }

const serviceLabels: Record<EnrollmentService, string> = {
    academy: 'Academia',
    campus: 'Campus',
    tournament: 'Torneo',
}

export default function EnrollmentForm({
    campuses,
    tournaments,
    initialService,
    initialActivityId,
    familyPlayers = [],
    guardian,
}: {
    campuses: EnrollmentActivity[]
    tournaments: EnrollmentActivity[]
    initialService: EnrollmentService
    initialActivityId: string
    familyPlayers?: FamilyPlayer[]
    guardian?: {full_name: string; email: string | null; phone: string | null} | null
}) {
    const translate = useT()

    const [state, setState] = useState<{ success?: boolean; error?: string; message?: string }>({})
    const [pending, setPending] = useState(false)
    const [players, setPlayers] = useState([0])
    const [nextPlayer, setNextPlayer] = useState(1)

    async function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPending(true)
        setState({})
        const formData = new FormData(event.currentTarget)
        const data = Object.fromEntries(formData)
        const campusPreferences = players.filter(id => formData.get(`player_${id}_service`) === 'campus').map(id => `${formData.get(`player_${id}_child_name`)}: ${formData.get(`player_${id}_campus_period`) || 'Periodo por confirmar'} · ${formData.get(`player_${id}_campus_role`) || 'Modalidad por confirmar'}`)
        if (campusPreferences.length) data.notes = [data.notes, ...campusPreferences].filter(Boolean).join('\n')
        const children = players.map((id) => Object.fromEntries(['service', 'activity_id', 'child_name', 'birth_date', 'linked_child_id'].map((key) => [key, formData.get(`player_${id}_${key}`) || ''])))

        try {
            const response = await fetch('/api/enrollment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, children }),
            })
            const result = await response.json() as { success?: boolean; error?: string; message?: string }
            setState(result)
        } catch {
            setState({ success: false, error: 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.' })
        } finally {
            setPending(false)
        }
    }

    if (state.success) {
        return <section className="mx-auto max-w-2xl rounded-3xl border border-green-200 bg-white p-10 text-center shadow-2xl shadow-navy/15" role="status"><CheckCircle2 className="mx-auto h-14 w-14 text-green-600" /><h2 className="mt-5 font-heading text-3xl font-black uppercase text-navy">{translate("Solicitud recibida")}</h2><p className="mt-3 text-slate-600">{translate(state.message)}</p><Button asChild className="mt-7 bg-gold font-bold text-navy hover:bg-gold/80"><Link href="/">{translate("Volver a la web")}</Link></Button></section>
    }

    return (
        <form onSubmit={submitForm} className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-navy/15 md:p-10">
            <div className="space-y-6">
                <h2 className="font-heading text-2xl font-black text-navy">{translate("1. Jugadores y actividades")}</h2>
                <p className="text-sm text-slate-600">{translate("Añade a tus hijos y elige una actividad para cada uno. Solo tendrás que rellenar una vez los datos del tutor.")}</p>
                {translate(players.map((id, index) => <fieldset key={id} disabled={pending} className="min-w-0 space-y-5 rounded-2xl border border-slate-200 p-4 sm:p-6">
                    <legend className="px-2 font-bold text-navy">{translate("Jugador ")}{translate(index + 1)}</legend>
                    <PlayerFields prefix={`player_${id}_`} campuses={campuses} tournaments={tournaments} initialService={initialService} initialActivityId={initialActivityId} familyPlayers={familyPlayers} />
                    {translate(players.length > 1 && <Button type="button" variant="outline" className="min-h-11" onClick={() => setPlayers(players.filter((value) => value !== id))}>{translate("Quitar jugador ")}{translate(index + 1)}</Button>)}
                </fieldset>))}
                <Button type="button" variant="outline" disabled={pending || players.length >= 6} className="min-h-12 w-full border-gold text-navy" onClick={() => { setPlayers([...players, nextPlayer]); setNextPlayer(nextPlayer + 1) }}>{translate("Añadir otro hijo/a")}</Button>
                <p className="text-xs text-slate-500">{translate("Hasta 6 jugadores por envío. Secretaría revisará cada plaza por separado.")}</p>
            </div>

            <section className="border-t border-slate-200 pt-8">
                <h2 className="font-heading text-2xl font-black text-navy">{translate("2. Datos del tutor/a")}</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2"><Field label={translate("Nombre completo")} name="guardian_name" defaultValue={guardian?.full_name || ''} required autoComplete="name" /><Field label={translate("Email")} name="email" type="email" defaultValue={guardian?.email || ''} required autoComplete="email" /><Field label={translate("Teléfono")} name="phone" type="tel" defaultValue={guardian?.phone || ''} required autoComplete="tel" placeholder={translate("600 000 000")} /><div><label htmlFor="notes" className="text-sm font-bold text-slate-700">{translate("Observaciones (opcional)")}</label><Textarea id="notes" name="notes" maxLength={1000} className="mt-2 min-h-24 border-slate-300" placeholder={translate("Por ejemplo: disponibilidad, dudas o información que debamos conocer.")} /></div></div>
            </section>

            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <section aria-labelledby="enrollment-consents" className="space-y-3 border-t border-slate-200 pt-8">
                <h2 id="enrollment-consents" className="font-heading text-2xl font-black text-navy">{translate("3. Confirmaciones")}</h2>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 transition hover:border-gold/60"><input name="privacy_consent" type="checkbox" required className="mt-0.5 h-4 w-4 accent-gold" /><span>{translate("He leído la ")}<Link href="/privacidad" target="_blank" className="font-semibold text-navy underline">{translate("política de privacidad")}</Link> {translate(" y autorizo el tratamiento de estos datos para gestionar esta solicitud.")}</span></label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 transition hover:border-gold/60"><input name="terms_consent" type="checkbox" required className="mt-0.5 h-4 w-4 accent-gold" /><span>{translate("He leído y acepto las ")}<Link href="/terminos" target="_blank" className="font-semibold text-navy underline">{translate("condiciones generales de inscripción")}</Link>{translate(".")}</span></label>
                <p className="px-1 text-xs leading-relaxed text-slate-500">{translate("Al activar el acceso al Portal Familias, el tutor legal firmará el documento de aceptación. Quedará disponible en ")}<strong>{translate("Mis documentos")}</strong> {translate(" y en la ficha del jugador.")}</p>
            </section>
            {translate(state.error && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">{translate(state.error)}</p>)}
            <Button disabled={pending} className="h-12 w-full bg-gold text-base font-black text-navy shadow-lg shadow-gold/20 hover:bg-gold/80">{translate(pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {translate(" Enviando solicitud…")}</> : <><Send className="mr-2 h-4 w-4" /> {translate(players.length > 1 ? `Enviar solicitudes (${players.length} jugadores)` : 'Enviar solicitud de inscripción')}</>)}</Button>
            <p className="text-center text-xs text-slate-500">{translate("Enviar esta solicitud no crea un cargo ni confirma una plaza automáticamente.")}</p>
        </form>
    )
}

function Field({ label, ...props }: ComponentProps<typeof Input> & { label: string }) {
    const translate = useT()

    const id = props.name || label
    return <div><label htmlFor={id} className="text-sm font-bold text-slate-700">{translate(label)}</label><Input id={id} {...props} className="mt-2 h-11 border-slate-300" /></div>
}

function PlayerFields({ prefix, campuses, tournaments, initialService, initialActivityId, familyPlayers }: { prefix: string; campuses: EnrollmentActivity[]; tournaments: EnrollmentActivity[]; initialService: EnrollmentService; initialActivityId: string; familyPlayers: FamilyPlayer[] }) {
    const translate = useT()

    const [service, setService] = useState<EnrollmentService>(initialService)
    const [selectedChild, setSelectedChild] = useState('')
    const child = familyPlayers.find(c => c.id === selectedChild)
    const [activityId, setActivityId] = useState(initialActivityId)
    const activities = useMemo(() => service === 'campus' ? campuses : service === 'tournament' ? tournaments : [], [campuses, service, tournaments])
    return <div className="space-y-5">
            <section>
                <p className="text-xs font-bold tracking-[0.18em] text-gold uppercase">{translate("Tu inscripción")}</p>
                <h2 className="mt-1 font-heading text-3xl font-black uppercase text-navy">{translate("Actividad")}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {translate((Object.keys(serviceLabels) as EnrollmentService[]).map((item) => <label key={item} className={`cursor-pointer rounded-xl border p-4 transition ${service === item ? 'border-gold bg-gold/10 ring-1 ring-gold shadow-sm' : 'border-slate-200 hover:border-gold/60 hover:bg-slate-50'}`}><input className="sr-only" type="radio" name={`${prefix}service`} value={item} checked={service === item} onChange={() => { setService(item); setActivityId('') }} /><span className="block font-bold text-navy">{translate(serviceLabels[item])}</span><span className="mt-1 block text-xs text-slate-500">{translate(item === 'academy' ? 'Temporada deportiva' : item === 'campus' ? 'Edición intensiva' : 'Competición o evento')}</span></label>))}
                </div>
                {translate(service === 'campus' && <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div><label htmlFor={`${prefix}campus_period`} className="text-sm font-bold text-slate-700">{translate("Semana o pack solicitado")}</label><input id={`${prefix}campus_period`} name={`${prefix}campus_period`} required maxLength={100} placeholder={translate("Ej. Navidad: 22–24 diciembre o pack completo")} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm" /></div>
                    <div><label htmlFor={`${prefix}campus_role`} className="text-sm font-bold text-slate-700">{translate("Participación en el campus")}</label><select id={`${prefix}campus_role`} name={`${prefix}campus_role`} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="Jugador de campo">{translate("Jugador de campo")}</option><option value="Portero (tecnificación específica dentro del campus)">{translate("Portero · tecnificación específica")}</option></select></div>
                </div>)}
                {translate(service !== 'academy' && <div className="mt-5"><label htmlFor={`${prefix}activity_id`} className="text-sm font-bold text-slate-700">{translate(service === 'campus' ? 'Campus seleccionado' : 'Torneo seleccionado')}</label><select id={`${prefix}activity_id`} name={`${prefix}activity_id`} value={activityId} onChange={(event) => setActivityId(event.target.value)} required className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"><option value="">{translate("Selecciona una actividad")}</option>{translate(activities.map((activity) => <option key={activity.id} value={activity.id}>{translate(activity.name)} {translate(" · ")}{translate(activity.detail)}</option>))}</select>{translate(activities.length === 0 && <p className="mt-2 text-sm text-amber-700">{translate("Ahora mismo no hay convocatorias publicadas. Puedes contactar con la academia para recibir información.")}</p>)}</div>)}
            </section>

            <section className="border-t border-slate-200 pt-8">
                <h2 className="font-heading text-2xl font-black text-navy">{translate("Datos del jugador")}</h2>
                {translate(familyPlayers.length > 0 && <label className="mt-4 block text-sm font-bold">{translate("Usar una ficha existente")}<select name={`${prefix}linked_child_id`} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="mt-2 block w-full rounded-lg border p-3"><option value="">{translate("Nuevo jugador")}</option>{translate(familyPlayers.map(c => <option key={c.id} value={c.id}>{translate(c.full_name)}</option>))}</select></label>)}
                <div key={selectedChild} className="mt-4 grid gap-5 sm:grid-cols-2"><Field label={translate("Nombre completo del jugador")} name={`${prefix}child_name`} required autoComplete="name" defaultValue={child?.full_name || ''} readOnly={!!child} /><Field label={translate("Fecha de nacimiento")} name={`${prefix}birth_date`} type="date" required defaultValue={child?.birth_date || ''} /></div>
            </section>


    </div>
}
