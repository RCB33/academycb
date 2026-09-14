'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// Stripe can redirect before the signed webhook has committed. Refresh only
// this authenticated page; never infer payment from a URL parameter.
export function ConfirmationRefresh({ pending }: { pending: boolean }) {
    const router = useRouter()
    const [exhausted, setExhausted] = useState(false)

    useEffect(() => {
        if (!pending) return
        let checks = 0
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return
            router.refresh()
            checks += 1
            if (checks >= 12) {
                window.clearInterval(timer)
                setExhausted(true)
            }
        }, 2500)
        return () => window.clearInterval(timer)
    }, [pending, router])

    if (!pending) return null
    return <div className="rounded-xl border border-gold/40 bg-gold/10 p-4" role="status" aria-live="polite">
        <p>{exhausted
            ? 'La confirmación automática está tardando. No repitas el pago; puedes actualizar el estado sin crear otro cargo.'
            : 'Esperando la confirmación automática de Stripe. Esta pantalla se actualizará sola; no repitas el pago.'}</p>
        <Button variant="outline" className="mt-3 min-h-11" onClick={() => router.refresh()}>Actualizar estado</Button>
    </div>
}
