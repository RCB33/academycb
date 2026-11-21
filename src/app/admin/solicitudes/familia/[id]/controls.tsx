'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { prepareFamilyPayment } from '@/app/actions/family-billing'
export function FamilyPaymentControls({id,ready,pending}:{id:string;ready:boolean;pending:boolean}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function run(email:boolean) {
  if(busy)return
  setBusy(true);setMessage('')
  try {
   if(email) {
    const response=await fetch('/api/admin/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'email',id})})
    const data=await response.json();setMessage(data.error||data.message)
   } else {const result=await prepareFamilyPayment(id);setMessage(result.error||'Enlace familiar preparado. Ya puedes enviar el correo con el total conjunto.')}
   router.refresh()
  } catch {setMessage('No se pudo confirmar la operación. Actualiza antes de reintentar.')}
  finally {setBusy(false)}
 }
 return <div className="space-y-3"><button disabled={busy||pending} onClick={()=>run(ready)} className="min-h-12 rounded-xl bg-gold px-6 py-3 font-bold text-navy disabled:opacity-50">{busy?'Preparando…':ready?'Enviar correo de pago familiar':'Preparar enlace familiar'}</button>{pending&&<p className="text-sm text-slate-600">Primero acepta o descarta las plazas pendientes.</p>}{message&&<p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">{message}</p>}</div>
}
