'use client'
import { useState } from 'react'
import { MONTHLY_PAYMENT_CTA } from '@/lib/payment-request-email'
export function AcceptBilling({id,totalCents,subscription,enabled}:{id:string;totalCents:number;subscription:boolean;enabled:boolean}) {
 const [accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 return <div className="space-y-4"><label className="flex gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} /><span>He revisado los conceptos, importes y fechas. {subscription?'Acepto autorizar estos cobros mensuales hasta la fecha final indicada, sin renovación automática.':'Acepto realizar este pago único.'}</span></label>
 {!enabled&&<p className="rounded-lg bg-amber-50 p-3 text-sm">Academy todavía no ha habilitado esta modalidad. No se ha cobrado ni autorizado nada. Contacta con secretaría.</p>}
 <button disabled={!enabled||!accepted||busy} className="rounded-lg bg-navy px-5 py-3 text-white disabled:opacity-50" onClick={async()=>{setBusy(true);setError('');try{const response=await fetch(`/api/billing/${id}/checkout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accepted,totalCents})});const result=await response.json();if(!response.ok)throw Error(result.error);if(typeof result.url!=='string'||!result.url.startsWith('https://checkout.stripe.com/'))throw Error('Enlace no válido');window.location.assign(result.url)}catch(e){setError(e instanceof Error?e.message:'No se pudo continuar');setBusy(false)}}}>{busy?'Preparando…':subscription?MONTHLY_PAYMENT_CTA:'Pagar de forma segura'}</button><p role="status" className="text-sm text-red-700">{error}</p></div>
}
