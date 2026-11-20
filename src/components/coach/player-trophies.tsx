'use client'
import { useState,useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrophyCard } from '@/components/portal/trophy-card'
import { awardCoachAchievement } from '@/app/actions/coach-achievements'
import { useViewOnly } from '@/components/admin/view-only'

export type CoachAchievement={id:string;name:string;description:string;icon:string}
export type EarnedAchievement={achievement_id:string;earned_at:string;note:string|null}
export function PlayerTrophies({childId,achievements,earned}:{childId:string;achievements:CoachAchievement[];earned:EarnedAchievement[]}){
 const viewOnly=useViewOnly()
 const router=useRouter(),[selected,setSelected]=useState(''),[note,setNote]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[pending,start]=useTransition()
 const available=achievements.filter(a=>!earned.some(e=>e.achievement_id===a.id)),chosen=available.find(a=>a.id===selected)
 return <section className="space-y-5 rounded-3xl border border-amber-200 bg-white p-4 shadow-sm sm:p-6"><header><h2 className="flex items-center gap-2 text-xl font-black text-navy"><Trophy className="h-6 w-6 text-amber-600"/>Reconoce su esfuerzo</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Un trofeo y unas palabras que le animen a seguir creciendo. Al concederlo aparecerá en la sala de trofeos de su familia.</p></header>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{achievements.map(a=>{const award=earned.find(e=>e.achievement_id===a.id);return <TrophyCard key={a.id} achievement={a} isEarned={!!award} earnedAt={award?.earned_at} note={award?.note}/>})}</div>
 {viewOnly?<p className="text-sm text-slate-500">Vista de consulta: los reconocimientos se muestran sin conceder ni modificar trofeos.</p>:available.length>0?<form className="space-y-4 rounded-2xl bg-slate-50 p-4" onSubmit={e=>{e.preventDefault();if(viewOnly||!chosen)return;setError('');setMessage('');start(async()=>{try{const result=await awardCoachAchievement(childId,selected,note);if(!result.success)setError(result.error||'No se pudo conceder.');else{setMessage('Trofeo concedido y visible para la familia.');setSelected('');setNote('');router.refresh()}}catch{setError('No se pudo conceder. Inténtalo de nuevo.')}})}}>
 <label className="block text-sm font-bold text-navy">Elige un reconocimiento<select required value={selected} disabled={pending} onChange={e=>setSelected(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border bg-white p-3 text-base"><option value="">Selecciona un trofeo</option>{available.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
 <label className="block text-sm font-bold text-navy">Dedicatoria (opcional)<textarea value={note} disabled={pending} onChange={e=>setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Por tu esfuerzo, tu constancia y por ayudar siempre a tus compañeros. ¡Estamos orgullosos de ti!" className="mt-2 w-full rounded-xl border bg-white p-3 text-base font-normal"/></label>
 {chosen&&<div className="max-w-sm"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Vista previa del reconocimiento</p><TrophyCard achievement={chosen} isEarned note={note}/></div>}
 <p className="text-xs text-slate-500">Este reconocimiento se publica al pulsar el botón. Un trofeo ya concedido no se duplica; las correcciones las gestiona administración.</p>
 <Button className="h-auto min-h-12 w-full whitespace-normal bg-navy py-3 text-white hover:bg-slate-800" disabled={pending||!chosen}>{pending?'Concediendo…':'Conceder trofeo y mostrar a la familia'}</Button>
 </form>:<p className="text-sm text-slate-500">{achievements.length?'Ya tiene todos los trofeos disponibles.':'Administración todavía no ha creado trofeos.'}</p>}
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="text-sm text-green-800">{message}</p>}
 </section>
}
