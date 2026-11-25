'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { travelTournamentDetailsSchema, travelTournamentSummary } from '@/lib/travel-tournament'
import { acceptTravelTournament } from '@/app/actions/travel-tournaments'
import { updateEnrollmentRequestStatus } from '@/app/actions/enrollment'

type Request = { id: string; child_name: string; birth_date: string; guardian_name: string; email: string; phone: string; notes: string | null; status: string; tournament_details: unknown; accepted_child_id: string | null }
export function TravelRequestsReview({ requests }: { requests: Request[] }) {
    const [filter, setFilter] = useState('pending')
    const shown = requests.filter(r => filter === 'all' || (filter === 'pending' ? ['new', 'contacted', 'interested'].includes(r.status) : r.status === filter))
    return <><label className="block font-semibold">Mostrar<select className="ml-3 rounded-lg border p-3" value={filter} onChange={e => setFilter(e.target.value)}><option value="pending">Pendientes</option><option value="enrolled">Aceptadas</option><option value="lost">Descartadas</option><option value="all">Todas</option></select></label><p>{shown.length} solicitudes</p>{shown.map(r => <Review key={`${r.id}:${r.status}`} request={r} />)}</>
}
function Review({ request: r }: { request: Request }) {
    const router = useRouter(), lock = useRef(false)
    const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
    const parsed = travelTournamentDetailsSchema.safeParse(r.tournament_details)
    if (!parsed.success) return <article className="rounded-xl border bg-white p-6">{r.child_name}: revisa los datos de esta solicitud antes de aceptarla.</article>
    const d = parsed.data
    async function act(action: 'accept' | 'contacted' | 'interested' | 'lost') {
        if (lock.current) return
        if (action === 'lost' && !window.confirm('¿Descartar esta solicitud? No se borran la familia ni sus pagos.')) return
        lock.current = true; setBusy(true); setMessage('')
        try {
            const result = action === 'accept' ? await acceptTravelTournament(r.id, { version: d.offer_version, total: d.total_cents, plan: d.plan_choice }) : await updateEnrollmentRequestStatus(r.id, action)
            setMessage(result.success ? ('message' in result ? String(result.message) : 'Solicitud actualizada.') : result.error || 'No se pudo actualizar.')
            if (result.success) router.refresh()
        } catch { setMessage('No se pudo completar la acción. Recarga para comprobar el estado antes de reintentar.') }
        finally { lock.current = false; setBusy(false) }
    }
    const pending = ['new', 'contacted', 'interested'].includes(r.status)
    return <article className="space-y-4 rounded-2xl border bg-white p-5 sm:p-7">
        <header><h2 className="text-xl font-black">{r.child_name}</h2><p className="text-sm">{d.tournament.title} · {r.id.slice(0, 8).toUpperCase()} · {r.status === 'enrolled' ? 'Plaza aceptada' : r.status === 'lost' ? 'Descartada' : 'Pendiente de revisión'}</p></header>
        <p className="text-sm">Nacimiento: {r.birth_date} · {d.position === 'keeper' ? 'Portero' : 'Jugador de campo'} · Club: {d.club}</p>
        <p>{r.guardian_name}<br /><a className="break-all underline" href={`mailto:${r.email}`}>{r.email}</a> · <a className="underline" href={`tel:${r.phone}`}>{r.phone}</a></p>
        <pre className="whitespace-pre-wrap rounded-xl bg-amber-50 p-4 font-sans text-sm">{travelTournamentSummary(d)}</pre>
        <p className={d.image_consent ? 'text-sm' : 'text-sm font-bold text-red-700'}>{d.image_consent ? 'Autoriza imágenes de este torneo.' : 'NO autoriza imágenes de este torneo.'}</p>
        {r.notes && <details><summary className="cursor-pointer font-semibold">Datos y observaciones de la solicitud</summary><p className="mt-3 whitespace-pre-wrap text-sm">{r.notes}</p></details>}
        {pending && <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void act('accept')} className="min-h-11 rounded-xl bg-gold px-4 py-3 font-bold text-navy disabled:opacity-50">Aceptar plaza y enviar bienvenida</button><button disabled={busy} onClick={() => void act('contacted')} className="rounded-xl border px-4 py-3">Contactado</button><button disabled={busy} onClick={() => void act('interested')} className="rounded-xl border px-4 py-3">En trámite</button><button disabled={busy} onClick={() => void act('lost')} className="rounded-xl border px-4 py-3 text-red-700">Descartar</button></div>}
        {r.status === 'enrolled' && <div className="flex flex-wrap gap-4 text-sm font-semibold"><Link href={`/admin/crm/alumnos/${r.accepted_child_id}`} className="underline">Ver jugador y pagos</Link><button disabled={busy} className="underline" onClick={() => void act('accept')}>Revisar acceso y reintentar correo pendiente</button></div>}
        <Link className="inline-block text-sm font-semibold underline" href="/admin/actividades/correos">Estado de correos</Link>
        {message && <p role="status" className="rounded-xl bg-slate-100 p-4 text-sm">{message}</p>}
    </article>
}
