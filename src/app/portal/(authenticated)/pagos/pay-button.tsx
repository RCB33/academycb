'use client'
import { useT } from '@/lib/i18n/client'


import { useRef, useState } from 'react'
import { payReceipt, payEventRegistration } from './actions'
import { Button } from '@/components/ui/button'

export function PayReceiptButton({ paymentId, test, event = false }: { paymentId: string; test: boolean; event?: boolean }) {
    const translate = useT()

    const inFlight = useRef(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    return <div className="mt-3 w-full max-w-xs">
        <Button className="min-h-12 w-full bg-gold text-navy" disabled={busy} onClick={async () => {
            if (inFlight.current) return
            inFlight.current = true; setBusy(true); setError('')
            try {
                const result = await (event ? payEventRegistration(paymentId) : payReceipt(paymentId))
                if (result.url) { window.location.assign(result.url); return }
                setError(result.error || 'No se pudo abrir el pago.')
            } catch { setError('No se pudo conectar. Comprueba el estado antes de repetir.') }
            inFlight.current = false; setBusy(false)
        }}>{translate(busy ? 'Preparando…' : test ? 'Probar pago · sin cobro real' : 'Pagar con tarjeta')}</Button>
        {translate(error && <p className="mt-2 text-sm text-red-700" role="alert">{translate(error)}</p>)}
    </div>
}
