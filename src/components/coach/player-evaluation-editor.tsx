'use client'
import {useViewOnly} from '@/components/admin/view-only'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, SlidersHorizontal, Sparkles } from 'lucide-react'
import { EVALUATION_FIELDS, madridToday, type PlayerEvaluation } from '@/lib/player-evaluation'
import { updateStudentMetrics } from '@/app/actions/metrics'
import { Button } from '@/components/ui/button'
import { FifaCard } from '@/components/fifa-card'
import { PlayerRadarChart } from '@/components/admin/player-radar-chart'
import { PlayerEvolutionChart } from '@/components/admin/player-evolution-chart'
import { EvaluationMessage } from './evaluation-message'

type Skill = typeof EVALUATION_FIELDS[number][0]
function toValues(row?:PlayerEvaluation){return Object.fromEntries(EVALUATION_FIELDS.map(([key])=>[key,row ? String(row[key]) : ''])) as Record<Skill,string>}

export function PlayerEvaluationEditor({child,evaluations}:{child:{id:string;full_name:string;avatar_url?:string|null};evaluations:PlayerEvaluation[]}) {
    const viewOnly=useViewOnly()
    const router=useRouter(),today=madridToday(),initial=evaluations.find(e=>e.recorded_at===today)
    const [date,setDate]=useState(today),[values,setValues]=useState(()=>toValues(initial))
    const [notes,setNotes]=useState(initial?.notes||''),[published,setPublished]=useState(initial?.visible_to_guardian ?? false)
    const [message,setMessage]=useState(''),[error,setError]=useState(''),[pending,start]=useTransition()
    const scores=Object.fromEntries(EVALUATION_FIELDS.map(([key])=>[key,Number(values[key])])) as Record<Skill,number>
    const complete=EVALUATION_FIELDS.every(([key])=>values[key]?.trim()!=='' && Number.isInteger(scores[key]) && scores[key]>=0 && scores[key]<=99)
    function chooseDate(next:string){const row=evaluations.find(e=>e.recorded_at===next);setDate(next);setValues(toValues(row));setNotes(row?.notes||'');setPublished(row?.visible_to_guardian ?? false);setError('');setMessage('')}
    function setScore(key:Skill,value:string){setValues(previous=>({...previous,[key]:value}));setMessage('')}
    return <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700"><Sparkles className="h-4 w-4"/>Evolución deportiva</p><h2 className="mt-2 text-2xl font-black text-navy">Su esfuerzo. Su progreso. Su carta.</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Mueve las notas y comprueba cómo queda su tarjeta. La vista previa no guarda ni publica cambios.</p></header>
        <div className="grid items-start gap-6 xl:grid-cols-2">
        <div id="evaluation-preview" className="min-w-0 space-y-4 rounded-2xl bg-slate-50 p-3 sm:p-5 xl:sticky xl:top-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold"><span className="flex items-center gap-2 text-navy"><Eye className="h-4 w-4"/>Así lo verá la familia</span><span className="rounded-full bg-white px-3 py-1 text-slate-500">Vista previa · sin guardar</span></div>
            <FifaCard child={child} stats={complete?scores:null}/>
            <div className="rounded-2xl border bg-white p-3"><h3 className="font-bold text-navy">Análisis técnico en directo</h3>{complete?<><PlayerRadarChart metrics={scores}/><p className="text-center text-sm text-slate-500">Disciplina <strong className="text-navy">{scores.discipline}/99</strong> · Media de las 6 habilidades en la carta</p></>:<p className="flex min-h-40 items-center justify-center text-center text-sm text-slate-500">Completa las 7 notas para visualizar su carta y el gráfico.</p>}</div>
            <EvaluationMessage notes={notes}/>
        </div>
        <form className="min-w-0 space-y-5" onSubmit={event=>{event.preventDefault();if(viewOnly)return;setError('');setMessage('');start(async()=>{try{
            if(!complete){setError('Completa las 7 puntuaciones con números enteros de 0 a 99.');return}
            const result=await updateStudentMetrics(child.id,{...scores,notes,recorded_at:date,visible_to_guardian:published})
            if(!result.success)setError(result.error || 'No se pudo guardar.');else{setMessage(published?'Evaluación guardada y visible para la familia.':'Borrador guardado. La familia todavía no lo ve.');router.refresh()}
        }catch{setError('No se pudo guardar. Inténtalo de nuevo.')}})}}>
            <div className="flex flex-wrap items-end justify-between gap-3"><label className="block text-sm font-semibold">Fecha de revisión<input type="date" value={date} min="2020-01-01" max={today} required disabled={viewOnly || pending} onChange={e=>chooseDate(e.target.value)} className="mt-1 block min-h-11 max-w-full rounded-lg border p-2 text-base" /></label>{evaluations.length>0 && <Button type="button" variant="outline" disabled={viewOnly || pending} onClick={()=>{setValues(toValues(evaluations[0]));setMessage('Notas anteriores cargadas como punto de partida. Revisa y guarda los cambios.')}}>Usar últimas notas</Button>}</div>
            <p className="text-xs text-slate-500">Cada fecha conserva una revisión. Guardar otra vez en la misma fecha actualiza esa evaluación.</p>
            <h3 className="flex items-center gap-2 font-bold text-navy"><SlidersHorizontal className="h-4 w-4"/>Ajusta sus habilidades</h3>
            <div className="space-y-3">{EVALUATION_FIELDS.map(([key,label])=><div key={key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="flex items-center justify-between gap-3"><label htmlFor={`score-${key}`} className="text-sm font-bold text-navy">{label}</label><input id={`score-${key}`} type="number" aria-label={`Nota de ${label.toLocaleLowerCase()}`} inputMode="numeric" min={0} max={99} step={1} required disabled={viewOnly || pending} placeholder="—" value={values[key]} onChange={e=>setScore(key,e.target.value)} className="min-h-11 w-20 rounded-lg border bg-white p-2 text-center text-base font-black text-navy" /></div><input type="range" aria-label={`Ajustar ${label.toLocaleLowerCase()}`} min={0} max={99} step={1} disabled={viewOnly || pending} value={Number.isFinite(scores[key])?Math.max(0,Math.min(99,scores[key])):0} onChange={e=>setScore(key,e.target.value)} className="mt-1 h-11 w-full cursor-pointer accent-amber-500"/><div className="flex justify-between text-[10px] font-medium text-slate-400"><span>0 · Por trabajar</span><span>99 · Excelente</span></div></div>)}</div>
            <a href="#evaluation-preview" className="inline-flex min-h-11 items-center text-sm font-bold text-amber-700 xl:hidden">↑ Ver tarjeta actualizada</a>
            <label className="block text-sm font-bold text-navy">Valoración para el jugador y su familia<textarea value={notes} onChange={e=>{setNotes(e.target.value);setMessage('')}} maxLength={2000} rows={5} disabled={viewOnly || pending} placeholder="Ejemplo: Has mejorado mucho en el control y el pase. Tu esfuerzo se nota. El próximo reto será levantar la cabeza antes de recibir. ¡Sigue así!" className="mt-2 block w-full rounded-xl border p-3 text-base font-normal leading-relaxed"/><span className="mt-1 block text-right text-xs font-normal text-slate-400">{notes.length}/2000</span></label>
            <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm"><input type="checkbox" checked={published} disabled={viewOnly || pending} onChange={e=>setPublished(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-amber-600" /><span><strong>Mostrar evaluación y escrito a la familia</strong><span className="mt-1 block text-slate-600">Solo se publica al guardar con esta opción marcada. Las notas internas del equipo técnico permanecen privadas.</span></span></label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-green-800">{message}</p>}
            <Button className="h-auto min-h-12 w-full whitespace-normal bg-navy py-3 font-bold text-white hover:bg-slate-800" disabled={viewOnly || pending}>{pending?'Guardando…':published?'Guardar y mostrar a la familia':'Guardar borrador privado'}</Button>
        </form>
        </div>
        <div className="space-y-3 border-t pt-5"><h3 className="font-bold text-navy">Historial de evaluaciones guardadas</h3>{!evaluations.length && <p className="text-sm text-slate-500">Sin evaluaciones registradas.</p>}{evaluations.map(row=><div key={row.recorded_at} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"><span>{row.recorded_at} · {row.visible_to_guardian?'Visible para la familia':'Borrador interno'}</span><Button type="button" variant="outline" size="sm" disabled={pending} onClick={()=>chooseDate(row.recorded_at)}>{viewOnly?'Ver':'Editar'} {row.recorded_at}</Button></div>)}</div>
        <PlayerEvolutionChart metricsHistory={evaluations}/>
    </section>
}
