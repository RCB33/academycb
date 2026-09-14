'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelCheckout } from './actions'

export function CancelCheckout({kind,id}:{kind:'receipt'|'academy';id:string}) {
    const [busy,setBusy]=useState(false),[error,setError]=useState('')
    const router=useRouter()
    return <div className="mt-2 text-sm"><button type="button" disabled={busy} className="min-h-11 underline disabled:opacity-50" onClick={async()=>{
        if(busy)return;setBusy(true);setError('')
        try{const result=await cancelCheckout(kind,id);if(result.success)router.refresh();else setError(result.error || 'No se pudo cancelar.')}catch{setError('No se pudo conectar.')}
        setBusy(false)
    }}>{busy?'Cerrando enlace…':'Cancelar este intento de pago'}</button>{error&&<p role="alert" className="text-red-700">{error}</p>}</div>
}
