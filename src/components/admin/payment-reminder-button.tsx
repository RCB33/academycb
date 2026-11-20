'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { preparePaymentReminder, sendPaymentReminder } from '@/app/actions/payment-reminders'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

export function PaymentReminderButton({id}:{id:string}) {
    const router=useRouter()
    const [data,setData]=useState<Awaited<ReturnType<typeof preparePaymentReminder>>|null>(null)
    const [busy,setBusy]=useState(false),[reviewed,setReviewed]=useState(false),[guardianId,setGuardianId]=useState(''),[requestId,setRequestId]=useState('')
    async function send(){if(!data||!reviewed)return;const g=data.guardians.find(g=>g.id===guardianId);if(!g?.address)return;setBusy(true);try{const r=await sendPaymentReminder({paymentId:id,guardianId,requestId,amountCents:data.amountCents,recipient:g.address,reviewed});if(r.error){toast.error(r.error);return}toast.success(r.alreadySent?'Este recordatorio ya se había enviado hoy.':'Correo enviado al proveedor.');setData(null);router.refresh()}catch{toast.error('No se pudo confirmar el envío. Reintenta desde este mismo aviso.')}finally{setBusy(false)}}
    return <><Button size="sm" variant="outline" disabled={busy} onClick={async()=>{setBusy(true);setReviewed(false);setRequestId(crypto.randomUUID());try{const p=await preparePaymentReminder(id);setData(p);const gs=p.guardians.filter(g=>g.address);setGuardianId(gs.length===1?gs[0].id:'')}catch(e){toast.error(e instanceof Error?e.message:'No se pudo preparar')}finally{setBusy(false)}}}>Enviar recordatorio</Button>
    <Dialog open={!!data} onOpenChange={open=>{if(!open&&!busy)setData(null)}}><DialogContent className="max-h-[90dvh] overflow-auto"><DialogTitle>Revisar y enviar recordatorio</DialogTitle><DialogDescription>Comprueba primero si la familia ya entregó efectivo o si Stripe está procesando el cobro. El correo se enviará solo al pulsar el botón final.</DialogDescription><div className="rounded-xl bg-slate-50 p-4 text-sm whitespace-pre-wrap">{data?.message}</div><label className="text-sm font-semibold">Enviar a<select className="mt-2 w-full rounded-lg border p-2" value={guardianId} onChange={e=>{setGuardianId(e.target.value);setReviewed(false)}}><option value="">Elige un tutor</option>{data?.guardians.filter(g=>g.address).map(g=><option key={g.id} value={g.id}>{g.name} · {g.address}</option>)}</select></label>{!data?.guardians.some(g=>g.address)&&<p className="text-sm text-amber-800">Vincula un tutor con correo válido antes de enviar.</p>}<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} className="mt-1"/>He revisado el efectivo y los cobros de tarjeta: este importe sigue pendiente.</label><p className="text-xs text-slate-500">Se vuelve a comprobar el saldo antes de enviar. Máximo un aviso diario por tutor y recibo.</p><Button disabled={busy||!reviewed||!guardianId} onClick={()=>void send()}>{busy?'Enviando…':'Enviar correo recordatorio'}</Button></DialogContent></Dialog></>
}
