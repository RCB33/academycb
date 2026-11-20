'use client'
import Link from 'next/link'
import type { AdminView } from '@/lib/admin-view'
import { ViewSwitcher } from './view-switcher'

export function AdminViewBar({ view }: { view: AdminView }) {
    return <aside aria-label="Vista de administrador" className="z-40 shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 text-navy">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1"><p className="text-sm font-bold">{view.kind === 'parents' ? 'Vista padres' : 'Vista entrenador'} <span className="font-normal text-slate-600">· Solo consulta</span></p><Link href="/admin/dashboard" className="text-xs font-semibold underline">Volver a administración</Link></div>
            <div className="sm:order-3"><ViewSwitcher current={view.kind}/></div>
            {view.kind === 'parents' && (view.options.length ? <form action="/api/admin/view" method="post" className="w-full sm:order-2 sm:w-64"><input type="hidden" name="kind" value={view.kind}/><label className="sr-only" htmlFor={`view-${view.kind}`}>{view.kind === 'parents' ? 'Familia que quieres ver' : 'Entrenador que quieres ver'}</label><select id={`view-${view.kind}`} name="id" defaultValue={view.selectedId} onChange={e => e.currentTarget.form?.requestSubmit()} className="min-h-10 w-full rounded-xl border border-amber-300 bg-white px-2 text-sm font-medium">{view.options.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></form> : <p className="w-full text-xs sm:order-2 sm:w-auto">{view.kind === 'parents' ? 'Todavía no hay familias con acceso.' : 'Todavía no hay entrenadores con acceso.'}</p>)}
        </div>
    </aside>
}
