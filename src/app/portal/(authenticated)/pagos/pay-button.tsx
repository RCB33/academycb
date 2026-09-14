'use client'

import { useRef, useState } from 'react'
import { payReceipt } from './actions'
import { Button } from '@/components/ui/button'

export function PayReceiptButton({ paymentId, test }: { paymentId: string; test: boolean }) {
    const inFlight = useRef(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    return <div className="mt-3 w-full max-w-xs">
        <Button className="min-h-12 w-full bg-gold text-navy" disabled={busy} onClick={async () => {
            if (inFlight.current) return
            inFlight.current = true; setBusy(true); setError('')
            try {
                const result = await payReceipt(paymentId)
                if (result.url) { window.location.assign(result.url); return }
                setError(result.error || 'No se pudo abrir el pago.')
            } catch { setError('No se pudo conectar. Comprueba el estado antes de repetir.') }
            inFlight.current = false; setBusy(false)
        }}>{busy ? 'Preparando…' : test ? 'Probar pago · sin cobro real' : 'Pagar con tarjeta'}</Button>
        {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </div>
}
