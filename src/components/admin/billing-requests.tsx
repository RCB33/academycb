'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateChargeDialog } from './create-charge-dialog'
import { billingLabels, billingSummary, euros, type BillingRequest } from '@/lib/billing-request'
type Guardian={id:string;full_name:string;email:string|null;phone:string|null;user_id:string|null}
type Workspace={children:{id:string;full_name:string}[];requests:(BillingRequest&{recipient_email:string|null;billing_request_attempts:{id:string;state:string;billing_status:string;billing_request_collections:{payment_id:string;amount_cents:number}[]}[]})[];guardians:Guardian[];receipts:{id:string;description:string;amount:number;due_date:string;covered_month:string|null}[];cardEnabled:boolean;recurringEnabled:boolean;emailConfigured:boolean}
export function BillingRequests({initialChildId=''}:{initialChildId?:string}) {
 const [child,setChild]=useState(initialChildId),[data,setData]=useState<Workspace|null>(null),[guardian,setGuardian]=useState('')
 const [kind,setKind]=useState<'payment'|'subscription'>('subscription'),[title,setTitle]=useState(''),[selected,setSelected]=useState<string[]>([])
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[requestId,setRequestId]=useState('')
 const load=useCallback(async()=>{const r=await fetch('/api/admin/billing'+(child?'?child_id='+child:''),{cache:'no-store'});const json=await r.json();if(!r.ok)throw Error(json.error);setData(json)},[child])
 useEffect(()=>{setSelected([]);setGuardian('');setRequestId(crypto.randomUUID());void load().catch(e=>setMessage(e.message))},[load])
 async function send(body:unknown) {const r=await fetch('/api/admin/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const json=await r.json();if(!r.ok)throw Error(json.error);return json}
 async function action(action:'email'|'cancel',r:Workspace['requests'][number]) {
  if(!confirm(action==='email'?`¿Enviar esta solicitud a ${r.recipient_email||'tutor sin email'}?`:'¿Cancelar el enlace y los cobros futuros de esta solicitud? No borra recibos ni devuelve importes ya cobrados.'))return
  setBusy(true);try {const result=await send({action,id:r.id});setMessage(result.message);await load()}catch(e){setMessage(e instanceof Error?e.message:'Error')}finally{setBusy(false)}
 }
 return <section className="space-y-5 rounded-2xl border bg-white p-5">
  <div><h2 className="text-2xl font-bold">Cobros y suscripciones por enlace</h2><p className="mt-1 text-sm text-slate-600">Prepara recibos, revisa las condiciones y envía una solicitud al tutor. Nunca introduzcas su tarjeta ni marques una autorización como cobrada.</p></div>
  {data&&!data.cardEnabled&&<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Puedes preparar solicitudes, pero los cobros con tarjeta todavía están desactivados. No envíes enlaces hasta completar la activación.</p>}
  {data&&!data.recurringEnabled&&<p className="text-sm text-amber-900">Las mensualidades automáticas están pendientes de validación y activación.</p>}
  <label className="block text-sm font-medium">Jugador<select value={child} onChange={e=>setChild(e.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Seleccionar jugador / ver todas las solicitudes</option>{data?.children.map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}</select></label>
  {child&&data&&<>
   <CreateChargeDialog childId={child} onSaved={()=>{void load().catch(e=>setMessage(e.message))}} />
   <form className="space-y-4 rounded-xl bg-slate-50 p-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await send({action:'create',id:requestId,childId:child,guardianId:guardian,kind,title,paymentIds:selected});setMessage('Solicitud preparada. Revisa el resumen antes de compartirla.');setRequestId(crypto.randomUUID());setSelected([]);await load()}catch(e){setMessage(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}}>
    <fieldset disabled={busy} className="space-y-4">
     <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Modalidad<select className="mt-1 w-full rounded border p-2" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="subscription">Mensualidades automáticas con fecha final</option></select></label>
     <label className="text-sm">Tutor que autoriza<select required className="mt-1 w-full rounded border p-2" value={guardian} onChange={e=>setGuardian(e.target.value)}><option value="">Seleccionar tutor</option>{data.guardians.filter(Boolean).map(g=><option key={g.id} value={g.id} disabled={!g.user_id}>{g.full_name}{!g.user_id?' — falta vincular cuenta':''}</option>)}</select></label></div>
     <label className="block text-sm">Título que verá la familia<input required minLength={2} maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded border p-2" placeholder="Tecnificación · mensualidades diciembre–mayo" /></label>
     <div className="space-y-2"><p className="text-sm font-semibold">Recibos pendientes</p>{data.receipts.length?data.receipts.map(p=><label key={p.id} className="flex items-start gap-3 rounded border bg-white p-3 text-sm"><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,p.id]:old.filter(id=>id!==p.id))}/><span className="flex-1">{p.description}<span className="block text-xs text-slate-500">Vencimiento {p.due_date} · {p.covered_month||'Concepto único'}</span></span><strong>{euros(Number(p.amount)*100)}</strong></label>):<p className="text-sm">No hay recibos elegibles. Crea primero la cuota o concepto. Los recibos con abonos manuales se gestionan por separado.</p>}</div>
     {kind==='subscription'&&<p className="text-xs text-slate-600">Selecciona mensualidades futuras consecutivas, del mismo importe y día de cobro (día 1). Se conserva el precio con descuento de cada recibo. Matrícula, primera cuota parcial, equipación y extras: transferencia.</p>}
     <p className="font-semibold">Total seleccionado: {euros(data.receipts.filter(p=>selected.includes(p.id)).reduce((s,p)=>s+Math.round(Number(p.amount)*100),0))}</p>
     <Button disabled={busy||!selected.length||!guardian}>Preparar solicitud</Button>
    </fieldset>
   </form>
  </>}
  <p role="status" aria-live="polite" className="text-sm">{message}</p>
  <div className="space-y-3">{data?.requests.map(r=>{
   const url=`${window.location.origin}/portal/pagos/solicitud/${r.id}`
   const available=data.cardEnabled&&(r.kind==='subscription'&&data.recurringEnabled)&&r.state==='ready'&&new Date(r.expires_at).getTime()>Date.now()
   const g=data.guardians.find(g=>g?.id===r.guardian_id);let phone=(g?.phone||'').replace(/\D/g,'');if(phone.length===9)phone='34'+phone
   const text=`Academy Costa Brava · ${r.title}\n${billingSummary(r)}\nRevisa y acepta desde tu cuenta: ${url}`
   return <article key={r.id} className="space-y-3 rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{r.title}</h3><span className="rounded bg-slate-100 px-2 py-1 text-xs">{billingLabels[r.state]||r.state}{new Date(r.expires_at).getTime()<Date.now()&&r.state==='ready'?' · Enlace caducado':''}</span></div><p className="text-sm">{billingSummary(r)}</p><p className="text-xs text-slate-500">Tutor: {g?.full_name||r.recipient_email||'Consultar ficha'} · Enlace hasta {r.expires_at.slice(0,10)} · Correo: {({not_sent:'no enviado',sending:'en curso',accepted:'aceptado por proveedor (entrega no confirmada)',failed:'envío no confirmado'} as Record<string,string>)[r.email_status]}</p>
    <p className="text-xs text-slate-500">Jugador: {data.children.find(c=>c.id===r.child_id)?.full_name||'Consultar ficha'}</p>
    {r.billing_request_attempts.filter(a=>!['expired','cancelled'].includes(a.state)||a.billing_request_collections.length).map(a=><div key={a.id} className="text-sm"><p>Stripe: {billingLabels[a.billing_status]||a.billing_status}</p><p>{r.mode==='test'?'Simulación confirmada':'Cobrado'}: {euros(a.billing_request_collections.reduce((total,c)=>total+Number(c.amount_cents),0))} · {a.billing_request_collections.length} de {r.billing_request_items.length} recibos</p></div>)}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy||!available} onClick={async()=>{try{await navigator.clipboard.writeText(url);setMessage('Enlace copiado')}catch{setMessage(url)}}}>Copiar enlace</Button><Button variant="outline" disabled={busy||!available||!data.emailConfigured||!r.recipient_email} onClick={()=>action('email',r)}>Enviar por correo</Button>{available&&/^\d{10,15}$/.test(phone)&&<Button asChild variant="outline"><a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></Button>}<Button variant="outline" disabled={busy||['completed','cancelled'].includes(r.state)} onClick={()=>action('cancel',r)}>Cancelar solicitud</Button></div>
   </article>
  })}</div>
  <Button variant="outline" disabled={busy} onClick={()=>load().catch(e=>setMessage(e.message))}>Actualizar estado</Button>
 </section>
}
