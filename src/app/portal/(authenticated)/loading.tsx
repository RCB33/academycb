'use client'

import { LoaderCircle } from 'lucide-react'
import { useT } from '@/lib/i18n/client'

// Keep this fallback inside the content area. The header and navigation remain
// usable, and Next can prefetch this light shell instead of blocking navigation.
export default function PortalSectionLoading() {
    const translate = useT()
    return <div className="space-y-5" aria-busy="true">
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-navy/10 bg-white p-5 text-navy shadow-sm">
            <LoaderCircle aria-hidden="true" className="h-6 w-6 shrink-0 animate-spin text-gold motion-reduce:animate-none" />
            <div><p className="font-bold">{translate('Cargando sección…')}</p><p className="mt-1 text-sm text-slate-500">{translate('Puedes seguir usando el menú mientras carga.')}</p></div>
        </div>
        <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
            <div className="h-36 rounded-3xl bg-navy/10" />
            <div className="grid gap-4 sm:grid-cols-2"><div className="h-40 rounded-2xl bg-slate-200/70" /><div className="h-40 rounded-2xl bg-slate-200/70" /></div>
        </div>
    </div>
}
