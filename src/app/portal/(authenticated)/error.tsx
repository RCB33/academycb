'use client'

import { useTransition } from 'react'
import { useT } from '@/lib/i18n/client'

export default function PortalSectionError({ retry }: { error: unknown; retry: () => void }) {
    const translate = useT()
    const [pending, startTransition] = useTransition()
    return <section role="alert" className="rounded-2xl border border-navy/10 bg-white p-6 text-navy shadow-sm">
        <h1 className="text-xl font-bold">{translate('No hemos podido cargar esta sección')}</h1>
        <p className="mt-2 text-sm text-slate-600">{translate('Comprueba tu conexión y vuelve a intentarlo. También puedes abrir otra sección desde el menú.')}</p>
        <button type="button" disabled={pending} onClick={() => startTransition(retry)} className="mt-5 min-h-11 rounded-xl bg-gold px-5 font-bold text-navy disabled:opacity-60">
            {translate(pending ? 'Cargando sección…' : 'Volver a intentar')}
        </button>
    </section>
}
