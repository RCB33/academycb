'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleDashed, RefreshCw, Search, Users } from 'lucide-react'
import { filterPortalUsage, needsPortalReview, portalUsageSummary, type PortalUsageFilter, type PortalUsageRow } from '@/lib/portal-usage'

const date = (value: string) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(value))

export function FamilyPortalUsage({ rows }: { rows: PortalUsageRow[] }) {
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<PortalUsageFilter>('all')
    const [refreshing, startTransition] = useTransition()
    const router = useRouter()
    const summary = portalUsageSummary(rows)
    const shown = filterPortalUsage(rows, filter, query)
    const cards: { label: string; value: number; filter: PortalUsageFilter }[] = [
        { label: 'Fichas de tutor', value: summary.total, filter: 'all' },
        { label: 'Han entrado', value: summary.visited, filter: 'visited' },
        { label: 'Sin visita registrada', value: summary.pending, filter: 'pending' },
        { label: 'Sin cuenta familiar', value: summary.noAccount, filter: 'no-account' },
    ]
    return <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h1 className="flex items-center gap-2 text-2xl font-bold text-navy"><Users className="text-gold" />Uso del Portal Familias</h1><p className="mt-2 text-sm text-slate-600">{summary.accounts} tutores con cuenta familiar. Comprueba de un vistazo quién ha entrado y quién necesita ayuda.</p></div>
            <button disabled={refreshing} onClick={() => startTransition(() => router.refresh())} className="flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />Actualizar</button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(card => <button key={card.filter} onClick={() => setFilter(card.filter)} aria-pressed={filter === card.filter} className={`rounded-2xl border p-4 text-left shadow-sm ${filter === card.filter ? 'border-gold bg-amber-50 ring-1 ring-gold' : 'border-slate-200 bg-white'}`}><span className="block text-3xl font-black text-navy">{card.value}</span><span className="mt-1 block text-sm text-slate-600">{card.label}</span></button>)}</div>
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-slate-700">La marca <strong>«Ha entrado» es automática</strong> al abrir el portal con una cuenta familiar. El registro comienza el 20/11/2026: las visitas anteriores no aparecen. «Sin visita registrada» no significa que nunca haya entrado. Crear una contraseña o entrar como administrador no cuenta como visita familiar.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1"><span className="sr-only">Buscar tutor, email o jugador</span><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar tutor, email o jugador…" className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm" /></label>
            <label><span className="sr-only">Filtrar tutores</span><select value={filter} onChange={event => setFilter(event.target.value as PortalUsageFilter)} className="h-11 w-full rounded-xl border bg-white px-3 text-sm"><option value="all">Todos los tutores</option><option value="visited">Han entrado</option><option value="pending">Sin visita registrada</option><option value="no-account">Sin cuenta familiar</option><option value="review">Fichas para revisar</option></select></label>
        </div>
        <p className="text-sm text-slate-500" aria-live="polite">{shown.length} de {rows.length} tutores</p>
        <div className="space-y-3">{shown.map(row => {
            const familyAccount = Boolean(row.user_id) && row.role === 'guardian'
            const visited = familyAccount && Boolean(row.first_seen_at)
            return <article key={row.id} className="grid gap-4 rounded-2xl border bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_1fr_1fr] lg:p-5">
                <div className="min-w-0"><Link href={`/admin/crm/tutores/${row.id}`} className="font-bold text-navy hover:underline">{row.full_name}</Link><p className="mt-1 break-all text-sm text-slate-600">{row.email || 'Sin email'}</p><p className="mt-2 text-xs font-medium text-slate-500">{familyAccount ? 'Cuenta familiar creada' : row.user_id ? `Cuenta de ${row.role === 'admin' ? 'administrador' : row.role === 'coach' ? 'entrenador' : 'otro perfil'}: no accede como familia` : 'Sin cuenta vinculada'}</p>
                    {needsPortalReview(row) && <div className="mt-2 space-y-1 text-xs text-amber-800">{row.duplicateEmail && <p>Email repetido en otras fichas: revisar vínculos.</p>}{row.players.length === 0 && <p>Sin jugadores activos vinculados.</p>}{row.user_id && row.role !== 'guardian' && <p>Revisar el acceso familiar sin cambiar el rol del equipo.</p>}</div>}
                </div>
                <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Jugadores</p>{row.players.length ? <ul className="space-y-1">{row.players.map(player => <li key={player.id}><Link href={`/admin/crm/alumnos/${player.id}`} className="text-sm text-navy hover:underline">{player.full_name}</Link></li>)}</ul> : <span className="text-sm text-slate-400">Sin vínculo activo</span>}</div>
                <div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${visited ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{visited ? <CheckCircle2 size={17} /> : <CircleDashed size={17} />}{visited ? 'Ha entrado' : familyAccount ? 'Sin visita registrada' : 'Sin cuenta familiar'}</span>{visited && row.first_seen_at && row.last_seen_at && <div className="mt-3 space-y-1 text-xs text-slate-500"><p>Primera visita: {date(row.first_seen_at)}</p><p>Última actividad: {date(row.last_seen_at)}</p></div>}<Link href={`/admin/crm/tutores/${row.id}`} className="mt-3 block text-sm font-semibold text-navy underline underline-offset-4">Ver ficha y acceso</Link></div>
            </article>
        })}{!shown.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-500">No hay tutores que coincidan con este filtro.</p>}</div>
    </div>
}
