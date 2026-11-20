'use client'
import {useViewOnly} from '@/components/admin/view-only'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EVALUATION_FIELDS, madridToday, type PlayerEvaluation } from '@/lib/player-evaluation'
import { updateStudentMetrics } from '@/app/actions/metrics'
import { Button } from '@/components/ui/button'

export function PlayerEvaluationEditor({childId,evaluations}:{childId:string;evaluations:PlayerEvaluation[]}) {
 const viewOnly=useViewOnly()
    const router=useRouter(),today=madridToday()
    const [date,setDate]=useState(today),[values,setValues]=useState<Partial<Record<typeof EVALUATION_FIELDS[number][0],string>>>(()=>toValues(evaluations.find(e=>e.recorded_at===today)))
    const [published,setPublished]=useState(evaluations.find(e=>e.recorded_at===today)?.visible_to_guardian ?? false)
    const [message,setMessage]=useState(''),[error,setError]=useState(''),[pending,start]=useTransition()
    function toValues(row?:PlayerEvaluation){return Object.fromEntries(EVALUATION_FIELDS.map(([key])=>[key,row ? String(row[key]) : '']))}
    function chooseDate(next:string){const row=evaluations.find(e=>e.recorded_at===next);setDate(next);setValues(toValues(row));setPublished(row?.visible_to_guardian ?? false);setError('');setMessage('')}
    return <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
        <div><h2 className="text-xl font-bold text-navy">Notas y evaluación deportiva</h2><p className="mt-1 text-sm text-slate-500">Pon una nota de 0 a 99 en cada habilidad. Cada fecha conserva una revisión; guardar de nuevo esa fecha actualiza sus notas.</p></div>
        <form className="space-y-4" onSubmit={event=>{event.preventDefault();setError('');setMessage('');start(async()=>{try{
            const scores=Object.fromEntries(EVALUATION_FIELDS.map(([key])=>[key,Number(values[key])]))
            if(EVALUATION_FIELDS.some(([key])=>!values[key]?.trim())){setError('Completa todas las puntuaciones.');return}
            const result=await updateStudentMetrics(childId,{...scores,recorded_at:date,visible_to_guardian:published})
            if(!result.success)setError(result.error || 'No se pudo guardar.');else{setMessage(published?'Evaluación guardada y visible para la familia.':'Borrador guardado. La familia todavía no lo ve.');router.refresh()}
        }catch{setError('No se pudo guardar. Inténtalo de nuevo.')}})}}>
            <label className="block text-sm font-semibold">Fecha de revisión<input type="date" value={date} min="2020-01-01" max={today} required disabled={viewOnly || pending} onChange={e=>chooseDate(e.target.value)} className="mt-1 block min-h-11 max-w-full rounded-lg border p-2 text-base" /></label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{EVALUATION_FIELDS.map(([key,label])=><label key={key} className="text-sm font-semibold">Nota de {label.toLocaleLowerCase()}<input type="number" inputMode="numeric" min={0} max={99} step={1} required disabled={viewOnly || pending} placeholder="0–99" value={values[key] ?? ''} onChange={e=>setValues({...values,[key]:e.target.value})} className="mt-1 block min-h-11 w-full rounded-lg border p-3 text-base" /></label>)}</div>
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={published} disabled={viewOnly || pending} onChange={e=>setPublished(e.target.checked)} className="mt-1 h-4 w-4" /><span><strong>Mostrar a la familia</strong><span className="block text-slate-500">Desmarcado: borrador interno. Las observaciones del equipo técnico siguen siendo privadas.</span></span></label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-green-800">{message}</p>}
            <Button disabled={viewOnly || pending}>{pending?'Guardando…':'Guardar evaluación'}</Button>
        </form>
        <div className="space-y-2 border-t pt-4"><h3 className="font-semibold">Historial de evaluaciones</h3>{!evaluations.length && <p className="text-sm text-slate-500">Sin evaluaciones registradas.</p>}{evaluations.map(row=><div key={row.recorded_at} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span>{row.recorded_at} · {row.visible_to_guardian?'Visible para la familia':'Borrador interno'}</span><Button type="button" variant="outline" size="sm" disabled={pending} onClick={()=>chooseDate(row.recorded_at)}>{viewOnly ? 'Ver' : 'Editar'} {row.recorded_at}</Button></div>)}</div>
    </section>
}
