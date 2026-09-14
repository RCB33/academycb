'use client'
import { useRef, useState } from 'react'
import { payAcademy } from './actions'
import { Button } from '@/components/ui/button'

export function AcademyOption({ membershipId, choice, amount, fee, months, test }: { membershipId: string; choice: 'full' | 'monthly'; amount: number; fee: number; months: number; test: boolean }) {
    const [accepted,setAccepted] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('')
    const lock = useRef(false)
    const total = amount * (choice === 'monthly' ? months : 1) + fee
    const money = (n: number) => n.toLocaleString('es-ES',{ style:'currency',currency:'EUR' })
    return <div className="space-y-3 rounded-xl border p-4">
        <h3 className="font-bold text-navy">{choice === 'full' ? 'Pago completo' : `${months} mensualidades`}</h3>
        <p className="text-xl font-bold">{money(amount)}{choice === 'monthly' ? ' / mes' : ''}</p>
        <p className="text-sm">Matrícula única: {money(fee)}. Total: <strong>{money(total)}</strong>.</p>
        {choice === 'monthly' && <p className="text-sm text-slate-600">Primero autorizas la tarjeta. El primer cobro se procesa después de activarla; los siguientes son mensuales. Finaliza a los {months} meses, sin renovación automática.</p>}
        <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={accepted} onChange={e=>setAccepted(e.target.checked)} />Confirmo el importe{choice === 'monthly' ? ` y autorizo los ${months} cobros mensuales indicados` : ' total indicado'}{test ? ' en modo de pruebas, sin dinero real' : ''}.</label>
        <Button className="min-h-12 w-full bg-gold text-navy" disabled={!accepted || busy} onClick={async()=>{
            if(lock.current) return; lock.current=true; setBusy(true); setError('')
            try { const result=await payAcademy(membershipId,choice,accepted,{unitCents:Math.round(amount*100),feeCents:Math.round(fee*100),months}); if(result.url){window.location.assign(result.url);return} setError(result.error || 'No se pudo continuar.') } catch {setError('No se pudo conectar.')}
            lock.current=false; setBusy(false)
        }}>{busy ? 'Preparando…' : `${test ? 'Probar: ' : ''}${choice === 'full' ? 'Pagar completo' : 'Activar mensualidades'}`}</Button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
}
