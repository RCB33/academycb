'use client'
import { useT } from '@/lib/i18n/client'

import { useRef, useState } from 'react'
import { payAcademy } from './actions'
import { Button } from '@/components/ui/button'

export function AcademyOption({ membershipId, choice, amount, fee, months, test }: { membershipId: string; choice: 'full' | 'monthly'; amount: number; fee: number; months: number; test: boolean }) {
    const translate = useT()

    const [accepted,setAccepted] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('')
    const lock = useRef(false)
    const total = amount * (choice === 'monthly' ? months : 1) + fee
    const money = (n: number) => n.toLocaleString(translate.locale,{ style:'currency',currency:'EUR' })
    return <div className="space-y-3 rounded-xl border p-4">
        <h3 className="font-bold text-navy">{translate(choice === 'full' ? 'Pago completo' : `${months} mensualidades`)}</h3>
        <p className="text-xl font-bold">{translate(money(amount))}{translate(choice === 'monthly' ? ' / mes' : '')}</p>
        <p className="text-sm">{translate("Matrícula única: ")}{translate(money(fee))}{translate(". Total: ")}<strong>{translate(money(total))}</strong>{translate(".")}</p>
        {translate(choice === 'monthly' && <p className="text-sm text-slate-600">{translate("Primero autorizas la tarjeta. El primer cobro se procesa después de activarla; los siguientes son mensuales. Finaliza a los ")}{translate(months)} {translate(" meses, sin renovación automática.")}</p>)}
        <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={accepted} onChange={e=>setAccepted(e.target.checked)} /><span>{translate("Confirmo el importe")}{translate(choice === 'monthly' ? ` y autorizo los ${months} cobros mensuales indicados` : ' total indicado')}{translate(test ? ' en modo de pruebas, sin dinero real' : '')}{translate(".")}</span></label>
        <Button className="min-h-12 h-auto whitespace-normal py-3 w-full bg-gold text-navy" disabled={!accepted || busy} onClick={async()=>{
            if(lock.current) return; lock.current=true; setBusy(true); setError('')
            try { const result=await payAcademy(membershipId,choice,accepted,{unitCents:Math.round(amount*100),feeCents:Math.round(fee*100),months}); if(result.url){window.location.assign(result.url);return} setError(result.error || 'No se pudo continuar.') } catch {setError('No se pudo conectar.')}
            lock.current=false; setBusy(false)
        }}>{translate(busy ? 'Preparando…' : `${test ? 'Probar: ' : ''}${choice === 'full' ? 'Pagar completo' : 'Activar mensualidades'}`)}</Button>
        {translate(error && <p role="alert" className="text-sm text-red-700">{translate(error)}</p>)}
    </div>
}
