'use client'
import { useT } from '@/lib/i18n/client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelCheckout } from './actions'

export function CancelCheckout({kind,id}:{kind:'receipt'|'academy'|'event';id:string}) {
    const translate = useT()

    const [busy,setBusy]=useState(false),[error,setError]=useState('')
    const router=useRouter()
    return <div className="mt-2 text-sm"><button type="button" disabled={busy} className="min-h-11 underline disabled:opacity-50" onClick={async()=>{
        if(busy)return;setBusy(true);setError('')
        try{const result=await cancelCheckout(kind,id);if(result.success)router.refresh();else setError(result.error || 'No se pudo cancelar.')}catch{setError('No se pudo conectar.')}
        setBusy(false)
    }}>{translate(busy?'Cerrando enlace…':'Cancelar este intento de pago')}</button>{translate(error&&<p role="alert" className="text-red-700">{translate(error)}</p>)}</div>
}
