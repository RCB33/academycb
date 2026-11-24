'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTranslator, type Locale } from '@/lib/i18n/translate'
import { useViewOnly } from '@/components/admin/view-only'

export function StartMonthlyCard({ guardianId, enabled, locale }: { guardianId: string; enabled: boolean; locale: Locale }) {
    const t = createTranslator(locale)
    const viewOnly = useViewOnly()
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    return <div className="space-y-3">
        <button disabled={!enabled || viewOnly || busy} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gold px-5 py-3 text-center text-sm font-bold text-navy disabled:opacity-50 sm:w-auto" onClick={async () => {
            setBusy(true); setError('')
            try {
                const response = await fetch('/api/billing/monthly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guardianId }) })
                const result = await response.json()
                if (!response.ok) throw Error(result.error)
                if (!/^\/portal\/pagos\/solicitud\/[0-9a-f-]{36}$/i.test(result.url)) throw Error(t('No se pudo abrir la autorización.'))
                router.push(result.url)
            } catch (e) { setError(e instanceof Error ? e.message : t('No se pudo abrir la autorización.')); setBusy(false) }
        }}>{t(busy ? 'Abriendo tus mensualidades…' : 'Añadir tarjeta y activar mensualidades')}</button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
}
