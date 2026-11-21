'use client'
import { FormDraft, DraftNotice, DraftInput, DraftSelect, DraftTextarea, DraftScope, useDraftState, useFormDraft } from '@/components/forms/form-draft'
import { AcademySelection } from './academy-selection'
import type { AcademyOffer, CampusOffer, TournamentOffer } from '@/lib/offering'
import { BirthDateInput } from '@/components/ui/birth-date-input'
import { CampusFields, TournamentFields } from './activity-fields'
import { combinedFormData, combinedQuote } from '@/lib/combined-enrollment'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/client'


import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type EnrollmentService = 'academy' | 'campus' | 'tournament'
export type EnrollmentActivity = { id: string; name: string; detail: string }
type FamilyPlayer = { id: string; full_name: string; birth_date: string | null }

const serviceLabels: Record<EnrollmentService, string> = {
    academy: 'Academia',
    campus: 'Campus',
    tournament: 'Torneos',
}

export default function EnrollmentForm(props: ComponentProps<typeof EnrollmentFields>) {
    const desiredKey = `academy:draft:combined-enrollment:${props.guardian?.email || 'guest'}`
    const [draftKey, setDraftKey] = useState(desiredKey)
    useEffect(() => {
        if (draftKey === desiredKey) return
        // Verification refreshes this page's props: move this tab's in-progress
        // draft before remounting the verified form, without losing any fields.
        try {
            const value = sessionStorage.getItem(draftKey)
            if (value) sessionStorage.setItem(desiredKey, value)
            sessionStorage.removeItem(draftKey)
            setDraftKey(desiredKey)
        } catch { /* Keep the current in-memory form if storage is unavailable. */ }
    }, [desiredKey, draftKey])
    return <FormDraft storageKey={draftKey}><EnrollmentFields {...props} /></FormDraft>
}

function EnrollmentFields({
    academyOffer,
    campuses,
    tournaments,
    initialService,
    initialActivityId,
    familyPlayers = [],
    guardian,
    verified = false,
}: {
    academyOffer: AcademyOffer
    campuses: CampusOffer[]
    tournaments: TournamentOffer
    initialService: EnrollmentService
    initialActivityId: string
    familyPlayers?: FamilyPlayer[]
    verified?: boolean
    guardian?: {full_name: string; email: string | null; phone: string | null} | null
}) {
    const translate = useT()

    const [state, setState] = useState<{ success?: boolean; error?: string; message?: string }>({})
    const [pending, setPending] = useState(false)
    const [players, setPlayers] = useDraftState('players', [0], ids => ids.length > 0 && ids.length <= 6 && new Set(ids).size === ids.length && ids.every(id => Number.isInteger(id) && id >= 0))
    const [nextPlayer, setNextPlayer] = useDraftState<number>('nextPlayer', 1)
    const draft = useFormDraft()
    const [requestId, setRequestId] = useDraftState<string>('requestId', '')
    const formRef = useRef<HTMLFormElement>(null)
    const [summary, setSummary] = useState<ReturnType<typeof combinedQuote> | null>(null)
    function updateSummary(ids = players) {
        // Read after React commits checkbox-dependent inputs (packs, extras).
        setTimeout(() => {
            if (formRef.current) setSummary(combinedQuote(combinedFormData(new FormData(formRef.current), ids, '').children, academyOffer, campuses, tournaments))
        }, 0)
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (formRef.current) setSummary(combinedQuote(combinedFormData(new FormData(formRef.current), players, '').children, academyOffer, campuses, tournaments))
        }, 0)
        return () => clearTimeout(timer)
    }, [players, academyOffer, campuses, tournaments])

    async function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setPending(true)
        setState({})
        const id = requestId || crypto.randomUUID()
        if (!requestId) setRequestId(id)
        const data = combinedFormData(new FormData(event.currentTarget), players, id)

        try {
            const response = await fetch('/api/enrollment/combined', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result = await response.json() as { success?: boolean; error?: string; message?: string }
            if (result.success) draft.clear()
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
        <form ref={formRef} onChange={() => updateSummary()} onClick={() => updateSummary()} onSubmit={submitForm} className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-navy/15 md:p-10">
            <DraftNotice />
            <div className="space-y-6">
                <h2 className="font-heading text-2xl font-black text-navy">{translate("1. Jugadores y actividades")}</h2>
                <p className="text-sm text-slate-600">{translate("Añade a tus hijos y marca una o varias actividades para cada uno. Rellena una sola vez los datos del jugador y del tutor.")}</p>
                {translate(players.map((id, index) => <fieldset key={id} disabled={pending} className="min-w-0 space-y-5 rounded-2xl border border-slate-200 p-4 sm:p-6">
                    <legend className="px-2 font-bold text-navy">{translate("Jugador ")}{translate(index + 1)}</legend>
                    <PlayerFields academyOffer={academyOffer} prefix={`player_${id}_`} campuses={campuses} tournaments={tournaments} initialService={initialService} initialActivityId={initialActivityId} familyPlayers={familyPlayers} verified={verified} />
                    {translate(players.length > 1 && <Button type="button" variant="outline" className="min-h-11" onClick={() => { const remaining = players.filter((value) => value !== id); setPlayers(remaining); updateSummary(remaining) }}>{translate("Quitar jugador ")}{translate(index + 1)}</Button>)}
                </fieldset>))}
                <Button type="button" variant="outline" disabled={pending || players.length >= 6} className="min-h-12 w-full border-gold text-navy" onClick={() => { setPlayers([...players, nextPlayer]); setNextPlayer(nextPlayer + 1); updateSummary([...players, nextPlayer]) }}>{translate("Añadir otro hijo/a")}</Button>
                <p className="text-xs text-slate-500">{translate("Hasta 6 jugadores por envío. Secretaría revisará cada plaza por separado.")}</p>
            </div>

            <section className="border-t border-slate-200 pt-8">
                <h2 className="font-heading text-2xl font-black text-navy">{translate("2. Datos del tutor/a")}</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2"><Field label={translate("Nombre completo")} name="guardian_name" defaultValue={guardian?.full_name || ''} required autoComplete="name" /><Field key={verified ? guardian?.email : 'unverified'} label={translate("Email")} name="email" type="email" defaultValue={guardian?.email || ''} required readOnly={verified} autoComplete="email" /><Field label={translate("Teléfono")} name="phone" type="tel" defaultValue={guardian?.phone || ''} required autoComplete="tel" placeholder={translate("600 000 000")} /><div><label htmlFor="notes" className="text-sm font-bold text-slate-700">{translate("Observaciones (opcional)")}</label><DraftTextarea styled id="notes" name="notes" maxLength={1000} className="mt-2 min-h-24 border-slate-300" placeholder={translate("Por ejemplo: disponibilidad, dudas o información que debamos conocer.")} /></div></div>
            </section>

            <section className="space-y-3 rounded-2xl bg-navy p-5 text-white" aria-live="polite"><h2 className="text-xl font-bold text-gold">Resumen conjunto</h2>
                {!summary?.complete && <p className="text-sm">Completa las actividades, semanas y planes seleccionados para ver el total previsto.</p>}
                {summary?.lines.map((line, i) => <p key={i} className="flex justify-between gap-4 text-sm"><span>{line.player} · {line.activity}</span><strong className="whitespace-nowrap">{line.amount.toFixed(2)} €</strong></p>)}
                {summary?.complete && <p className="flex justify-between gap-4 border-t border-white/30 pt-3 font-bold"><span>Importe inicial previsto</span><span>{summary.initial.toFixed(2)} €</span></p>}
                {!!summary?.monthly.length && <div className="border-t border-white/30 pt-3"><h3 className="font-bold">Mensualidades posteriores de Academia</h3>{summary.monthly.map((m,i)=><p key={i} className="mt-2 text-sm">{m.player}: {m.count} mensualidades de {m.amount.toFixed(2)} €, hasta {new Date(m.until+'T12:00:00Z').toLocaleDateString('es-ES')}. No incluidas en el importe inicial.</p>)}</div>}
                <p className="text-xs text-slate-200">Hoy no pagas nada. La matrícula y los descuentos por hermanos se revisan antes de aceptar cada plaza. El resumen incluye la matrícula de nuevo jugador y la tarifa base del campus; no aplica descuentos pendientes de comprobar. No hay descuento adicional por combinar actividades.</p>
                <p className="text-xs text-slate-200">Si inscribes a varios hijos en Academia con tarjeta en este envío, recibirás un único enlace de Stripe cuando se resuelvan sus plazas. El primer pago suma las cuotas y extras de cada hijo; después habrá un solo cobro mensual con el desglose de todos. Efectivo, Campus y Torneos se gestionan por separado.</p>
                <p className="text-xs text-slate-200">Recibirás un correo de recepción por actividad. Después, un correo de aceptación con el importe confirmado y las instrucciones de pago de cada plaza.</p>
            </section>

            <DraftInput name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <section aria-labelledby="enrollment-consents" className="space-y-3 border-t border-slate-200 pt-8">
                <h2 id="enrollment-consents" className="font-heading text-2xl font-black text-navy">{translate("3. Confirmaciones")}</h2>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 transition hover:border-gold/60"><DraftInput name="privacy_consent" type="checkbox" required className="mt-0.5 h-4 w-4 accent-gold" /><span>{translate("He leído la ")}<Link href="/privacidad" target="_blank" className="font-semibold text-navy underline">{translate("política de privacidad")}</Link> {translate(" y autorizo el tratamiento de estos datos para gestionar esta solicitud.")}</span></label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 transition hover:border-gold/60"><DraftInput name="terms_consent" type="checkbox" required className="mt-0.5 h-4 w-4 accent-gold" /><span>{translate("He leído y acepto las ")}<Link href="/terminos" target="_blank" className="font-semibold text-navy underline">{translate("condiciones generales de inscripción")}</Link>{translate(".")}</span></label>
                <p className="px-1 text-xs leading-relaxed text-slate-500">{translate("Al activar el acceso al Portal Familias, el tutor legal firmará el documento de aceptación. Quedará disponible en ")}<strong>{translate("Mis documentos")}</strong> {translate(" y en la ficha del jugador.")}</p>
            </section>
            {translate(state.error && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">{translate(state.error)}</p>)}
            <Button disabled={pending} className="min-h-12 h-auto whitespace-normal py-3 w-full bg-gold text-sm sm:text-base font-black text-navy shadow-lg shadow-gold/20 hover:bg-gold/80">{translate(pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {translate(" Enviando solicitud…")}</> : <><Send className="mr-2 h-4 w-4" /> {translate(players.length > 1 ? `Enviar solicitudes (${players.length} jugadores)` : 'Enviar solicitud de inscripción')}</>)}</Button>
            <p className="text-center text-xs text-slate-500">{translate("Enviar esta solicitud no crea un cargo ni confirma una plaza automáticamente.")}</p>
        </form>
    )
}

function Field({ label, ...props }: ComponentProps<typeof Input> & { label: string }) {
    const translate = useT()

    const id = props.name || label
    return <div><label htmlFor={id} className="text-sm font-bold text-slate-700">{translate(label)}</label><DraftInput styled id={id} {...props} className="mt-2 h-11 border-slate-300" /></div>
}

function PlayerFields({ academyOffer, prefix, campuses, tournaments, initialService, initialActivityId, familyPlayers, verified }: { academyOffer: AcademyOffer; prefix: string; campuses: CampusOffer[]; tournaments: TournamentOffer; initialService: EnrollmentService; initialActivityId: string; familyPlayers: FamilyPlayer[]; verified: boolean }) {
    const translate = useT()
    const router = useRouter()
    const [services, setServices] = useDraftState<EnrollmentService[]>(`${prefix}services`, [initialService], values => values.every(value => ['academy','campus','tournament'].includes(value)))
    const [selectedChild, setSelectedChild] = useDraftState<string>(`${prefix}child`, '', id => !id || familyPlayers.some(c => c.id === id))
    const child = familyPlayers.find(c => c.id === selectedChild)
    return <div className="space-y-5">
        <h3 className="text-xl font-bold">Datos del jugador</h3>
        {!!familyPlayers.length && <label className="block text-sm font-bold">Usar una ficha existente<DraftSelect name={`${prefix}linked_child_id`} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="mt-2 block w-full rounded-lg border p-3"><option value="">Nuevo jugador</option>{familyPlayers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</DraftSelect></label>}
        <DraftScope name={selectedChild}><div key={selectedChild} className="grid gap-5 sm:grid-cols-2"><Field label="Nombre completo del jugador" name={`${prefix}child_name`} required defaultValue={child?.full_name || ''} readOnly={!!child}/><BirthDateInput name={`${prefix}birth_date`} defaultValue={child?.birth_date || ''} readOnly={!!child?.birth_date}/></div></DraftScope>
        <fieldset><legend className="font-bold">¿A qué quieres apuntarlo? Puedes marcar las tres opciones.</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{(Object.keys(serviceLabels) as EnrollmentService[]).map(item => <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${services.includes(item)?'border-gold bg-gold/10':'border-slate-200'}`}><input name={prefix+item} type="checkbox" checked={services.includes(item)} onChange={e=>setServices(e.target.checked?[...services,item]:services.filter(s=>s!==item))}/><span className="font-bold">{translate(serviceLabels[item])}</span></label>)}</div></fieldset>
        {services.includes('academy') && <AcademySelection prefix={prefix} offer={academyOffer}/>}
        {services.includes('campus') && <CampusFields prefix={prefix+'campus_'} campuses={campuses} initialId={initialActivityId}/>}
        {!verified && (services.includes('tournament') || services.length > 1) && <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4"><p>Para combinar actividades o solicitar torneos, verifica primero tu correo. Tus datos de este formulario se mantienen en esta pestaña.</p><a href="/inscripcion?access=1" target="_blank" rel="noopener noreferrer" className="inline-block font-bold underline">Entrar o verificar correo en otra pestaña</a><button type="button" className="block rounded-lg border bg-white p-3 font-bold" onClick={()=>router.refresh()}>Ya he verificado mi correo</button></div>}
        {services.includes('tournament') && <>
            <TournamentFields prefix={prefix+'tournament_'} offer={tournaments} initialId={initialActivityId}/>
        </>}
    </div>
}
