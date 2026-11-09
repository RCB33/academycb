'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { christmasTournaments, registrationStatuses, tournamentQuote } from '@/lib/christmas-tournaments'
import { reviewEventRegistration } from '@/app/actions/event-registrations'
import { EventRegistrationFiles } from '@/components/event-registration-files'

type Registration = {
 id: string; status: string; tournaments: string[]; approved_tournaments: string[] | null; quoted_amount: number; approved_amount: number | null; created_at: string; admin_note: string; due_date: string | null;
 details: { child_name: string; birth_date: string; guardian_name: string; phone: string; email: string; club: string; coach: string; category: string; level: string; owns_kit: boolean; shirt_size: string; shorts_size: string; socks_size: string; champions_clothing: boolean; image_consent: boolean; notes: string }
}
export function RegistrationReview({ registrations }: { registrations: Registration[] }) {
 const [filter, setFilter] = useState('all')
 const [search, setSearch] = useState('')
 const filtered = registrations.filter(r => (filter === 'all' || r.status === filter) && `${r.details.child_name} ${r.details.guardian_name} ${r.details.email}`.toLowerCase().includes(search.toLowerCase()))
 return <><div className="flex flex-wrap gap-3"><input aria-label="Buscar jugador o familia" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador o familia" className="rounded-lg border p-3" /><select aria-label="Filtrar estado" value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border p-3"><option value="all">Todos los estados</option>{Object.entries(registrationStatuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><span className="p-3 text-sm">{filtered.length} inscripciones</span></div><div className="space-y-5">{filtered.map(r => <ReviewCard key={`${r.id}-${r.status}-${r.approved_amount}`} registration={r} />)}{!filtered.length && <p className="rounded-xl border bg-white p-8 text-center">No hay inscripciones con este filtro.</p>}</div></>
}
function ReviewCard({ registration: r }: { registration: Registration }) {
 const [selected, setSelected] = useState(r.approved_tournaments || r.tournaments)
 const [busy, setBusy] = useState(false)
 const [message, setMessage] = useState('')
 const router = useRouter()
 const quote = selected.length ? tournamentQuote(selected, r.details.owns_kit) : null
 return <article className="rounded-2xl border bg-white p-5 md:p-7"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{r.details.child_name}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{registrationStatuses[r.status]}</span></div><p className="mt-2 text-sm text-slate-500">{r.id.slice(0,8).toUpperCase()} · {new Date(r.created_at).toLocaleString('es-ES')} · {r.details.category} · {r.details.level}</p>
 <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold">Familia</dt><dd>{r.details.guardian_name} · <a href={`tel:${r.details.phone}`} className="underline">{r.details.phone}</a><br />{r.details.email}</dd></div><div><dt className="font-bold">Jugador</dt><dd>Nacimiento: {r.details.birth_date}<br />Club: {r.details.club} · Entrenador: {r.details.coach || 'No indicado'}</dd></div><div><dt className="font-bold">Equipación</dt><dd>{r.details.owns_kit ? 'Ya tiene equipación Academy' : `Solicita equipación: camiseta ${r.details.shirt_size}, pantalón ${r.details.shorts_size}, calcetines ${r.details.socks_size}`}<br />Ropa Champions: {r.details.champions_clothing ? 'Sí' : 'No'}</dd></div><div><dt className="font-bold">Imagen</dt><dd className={r.details.image_consent ? '' : 'font-bold text-red-700'}>{r.details.image_consent ? 'Autoriza a Academy' : 'NO autoriza imágenes'}</dd></div></dl>
 {r.details.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">Familia: {r.details.notes}</p>}
 {r.tournaments.includes('231') && r.tournaments.includes('champions') && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">Revisar compatibilidad del 27 de diciembre según el equipo. Antes de aprobar, acuerda con la familia qué torneo mantener si hay coincidencia.</p>}
 <form className="mt-5 space-y-4 border-t pt-4" onSubmit={async e => {e.preventDefault(); const native = e.nativeEvent as SubmitEvent; const operation = (native.submitter as HTMLButtonElement)?.value; if (!operation) return; if (operation === 'confirm' && !window.confirm('¿Has comprobado el ingreso en el banco? Se registrará como pagado en Finanzas.')) return; const data = new FormData(e.currentTarget); data.set('operation',operation); setBusy(true); const result = await reviewEventRegistration(data); setBusy(false); setMessage(result.error || 'Inscripción actualizada.'); if(!result.error)router.refresh()}}>
 <input type="hidden" name="id" value={r.id} /><div className="flex flex-wrap gap-4">{christmasTournaments.filter(t => r.tournaments.includes(t.id)).map(t => <label key={t.id} className="flex gap-2 text-sm"><input name="tournaments" value={t.id} type="checkbox" checked={selected.includes(t.id)} disabled={!['requested','awaiting_payment'].includes(r.status)} onChange={e => setSelected(e.target.checked ? [...selected,t.id] : selected.filter(id => id!==t.id))} />{t.name}</label>)}</div>
 <p className="font-bold">{['requested','awaiting_payment'].includes(r.status) ? `Importe a validar: ${quote?.total || 0} € (torneos ${quote?.tournaments || 0} € + ropa ${quote?.kit || 0} €)` : `Importe validado: ${Number(r.approved_amount || 0).toFixed(2)} €`}</p>
 {['requested','awaiting_payment'].includes(r.status) && <label className="block text-sm font-semibold">Fecha límite para la transferencia<input name="deadline" type="date" defaultValue={r.due_date || ''} className="mt-1 block rounded-lg border p-2" /></label>}
 <label className="block text-sm font-semibold">Mensaje para la familia / motivo<textarea name="note" defaultValue={r.admin_note} maxLength={1500} className="mt-1 block w-full rounded-lg border p-3" /></label>
 <div className="flex flex-wrap gap-3">{['requested','awaiting_payment'].includes(r.status) && <button disabled={busy || !selected.length} name="operation" value="approve" className="rounded-lg bg-navy px-4 py-2 font-semibold text-white disabled:opacity-50">Validar selección y habilitar transferencia</button>}{r.status==='proof_review' && <><button disabled={busy} name="operation" value="confirm" className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">He comprobado el ingreso: confirmar</button><button disabled={busy} name="operation" value="reject_proof" className="rounded-lg border px-4 py-2">Pedir corrección del justificante</button></>}{!['confirmed','cancelled'].includes(r.status) && <button disabled={busy} name="operation" value="cancel" className="rounded-lg border border-red-300 px-4 py-2 text-red-700">Anular solicitud</button>}</div>
 {message && <p role="status" className="text-sm text-amber-800">{message}</p>}</form>
 <EventRegistrationFiles id={r.id} status={r.status} admin />
 <p className="mt-4 text-xs text-slate-500">Los documentos y las acciones quedan registrados. La validación aparece en la cuenta familiar; avisa a la familia para que la revise.</p>
 </article>
}
