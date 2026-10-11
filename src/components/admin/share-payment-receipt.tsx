'use client'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
export function SharePaymentReceipt({id}:{id:string}){
 const [busy,setBusy]=useState(false)
 return <Button size="sm" variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{const response=await fetch(`/api/payments/${id}/receipt`);if(!response.ok)throw Error('No se pudo generar el comprobante');const file=new File([await response.blob()],`comprobante-${id}.pdf`,{type:'application/pdf'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Comprobante · Academy Costa Brava'})}else{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast.info('PDF descargado. Adjunta el archivo en WhatsApp o correo; no compartas la dirección privada del portal.')}}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))toast.error(e instanceof Error?e.message:'No se pudo compartir')}finally{setBusy(false)}}}>{busy?'Preparando…':'Compartir comprobante'}</Button>
}
