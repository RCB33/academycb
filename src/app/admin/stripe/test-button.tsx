'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createStripeTestCheckout } from './actions'

export function StripeTestButton() {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    return <div><Button disabled={busy} className="min-h-12 bg-gold text-navy" onClick={async () => {
        setBusy(true); setError('')
        try { const result = await createStripeTestCheckout(); if (result.url) { window.location.assign(result.url); return } setError(result.error || 'No se pudo crear la sesión.') } catch { setError('No se pudo conectar. Inténtalo de nuevo.') }
        setBusy(false)
    }}>{busy ? 'Preparando…' : 'Abrir pago ficticio de 1 €'}</Button>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}</div>
}
