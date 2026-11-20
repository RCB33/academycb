'use client'
import {useViewOnly} from '@/components/admin/view-only'
import {useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {saveCoachObservation} from '@/app/actions/coach'
import {Button} from '@/components/ui/button'
export function PlayerNotes({childId,notes}:{childId:string;notes:Array<{id:string;body:string;created_at:string}>}){
 const viewOnly=useViewOnly()
 const [body,setBody]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[pending,start]=useTransition(),router=useRouter()
 return <section className="rounded-2xl border bg-white p-4 sm:p-6"><h2 className="text-xl font-bold text-navy">Revisión y notas del entrenador</h2><p className="mt-2 text-sm text-slate-500">Qué ha mejorado, qué debe trabajar y objetivos para la próxima sesión. Estas notas son internas, no las ve la familia.</p><form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();setMessage('');setError('');start(async()=>{const result=await saveCoachObservation(childId,body);if(result.success){setBody('');setMessage('Revisión guardada.');router.refresh()}else setError(result.error||'No se pudo guardar.')})}}><label className="block text-sm font-semibold">Nueva revisión<textarea className="mt-2 min-h-32 w-full rounded-xl border p-3 text-base" value={body} onChange={e=>setBody(e.target.value)} minLength={2} maxLength={2000} disabled={viewOnly || pending} required placeholder="Por ejemplo: mejora en el pase; trabajar el control orientado…"/></label><Button disabled={viewOnly || pending} className="min-h-11">{pending?'Guardando…':'Guardar revisión'}</Button>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="text-sm text-green-800">{message}</p>}</form><div className="mt-5 space-y-3">{notes.map(n=><article key={n.id} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString('es-ES',{timeZone:'Europe/Madrid'})}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{n.body}</p></article>)}</div></section>
}
