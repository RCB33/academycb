'use client'

import { useState } from 'react'
import type { WebhookProbeStatus } from '@/lib/stripe-webhook-probe'

export function WebhookProbe() {
    const [probe, setProbe] = useState<WebhookProbeStatus | null>(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    async function run(create: boolean) {
        setBusy(true); setMessage('')
        try {
            const url = '/api/admin/stripe/webhook-probe'
            const r = await fetch(url + (!create && probe ? `?session_id=${probe.sessionId}` : ''), create ?
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' } : { cache: 'no-store' })
            const data = await r.json()
            if (!r.ok) throw new Error(data.error || 'No se pudo completar la comprobación.')
            let next: WebhookProbeStatus | null = data.probe
            setProbe(next)
            if (create && next) {
                for (let i = 0; i < 8 && !next.verified; i++) {
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    const check: Response = await fetch(`${url}?session_id=${next.sessionId}`, { cache: 'no-store' })
                    if (!check.ok) break
                    next = (await check.json()).probe
                    setProbe(next)
                    if (!next) break
                }
            }
            setMessage(!next ? 'Todavía no hay pruebas técnicas.' : next.verified ?
                'Entrega firmada recibida y verificada. No se ha cobrado nada.' : next.expired ?
                    'Sesión caducada sin pagar. Esperando el webhook; pulsa Actualizar estado en unos segundos.' :
                    'La sesión aún no consta caducada. No abras ni pagues ningún enlace. Revisa la prueba en Stripe.')
        } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo completar la comprobación.') }
        finally { setBusy(false) }
    }
    return <section className="space-y-3 rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">Prueba del webhook sin cobro</h2>
        <p className="text-sm text-slate-600">Crea una sesión técnica de 1 € y la caduca inmediatamente, sin tarjeta ni pago. Stripe enviará el evento de caducidad. No modifica recibos, inscripciones ni suscripciones.</p>
        <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => run(true)} className="rounded-lg bg-navy px-4 py-2 text-white disabled:opacity-50">{busy ? 'Comprobando…' : 'Probar webhook sin cobrar'}</button>
            <button type="button" disabled={busy} onClick={() => run(false)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Actualizar estado</button>
        </div>
        <p role="status" aria-live="polite" className="text-sm">{message}</p>
        {probe && <div className="break-all rounded-lg bg-slate-50 p-3 text-xs"><p>Sesión: {probe.sessionId}</p><p>Caducada: {probe.expired ? 'sí' : 'no'}</p><p>Webhook firmado: {probe.verified ? 'verificado' : 'pendiente'}</p>{probe.eventId && <p>Evento: {probe.eventId}</p>}</div>}
        <p className="text-xs text-slate-500">Esta prueba valida la entrega del webhook, no un cobro completo ni las mensualidades automáticas. Los clics repetidos durante cinco minutos reutilizan la misma sesión.</p>
    </section>
}
