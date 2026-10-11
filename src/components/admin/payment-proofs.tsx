'use client'
import { useState } from 'react'
import { attachPaymentProof,getPaymentProofs } from '@/app/actions/payment-proofs'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
export function PaymentProofs({batch}:{batch:string}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[files,setFiles]=useState<Awaited<ReturnType<typeof getPaymentProofs>>>([])
 async function load(){setBusy(true);try{setFiles(await getPaymentProofs(batch));setOpen(true)}catch{toast.error('No se pudieron cargar los justificantes')}finally{setBusy(false)}}
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const data=new FormData(form);data.set('batch',batch);setBusy(true);try{await attachPaymentProof(data);toast.success('Justificante privado guardado');form.reset();await load()}catch(err){toast.error(err instanceof Error?err.message:'No se pudo adjuntar')}finally{setBusy(false)}}
 return <div className="space-y-2"><Button size="sm" variant="outline" disabled={busy} onClick={load}>Justificantes</Button>{open&&<div className="rounded border p-3"><p className="text-xs">Solo administración y finanzas. No se modifica el importe del pago.</p>{files.map(f=><p key={f.id}>{f.url?<a className="underline" href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>:f.name}</p>)}<form onSubmit={save} className="mt-2 space-y-2"><input aria-label="Justificante PDF, JPG o PNG" className="w-full text-xs" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required/><p className="text-xs">PDF, JPG o PNG · máximo 3 MB</p><Button size="sm" disabled={busy}>Adjuntar justificante</Button></form></div>}</div>
}
