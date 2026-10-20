'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { assignFamilyPlan } from '@/app/actions/family-plans'
import { previewFamilyPlan, type PlanDefinition } from '@/lib/family-plan'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const euro = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
const field = 'mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm'
export function FamilyPlanAssignment({ childId, childName, plans, teams, defaultTeamId = '', onComplete }: {
    childId: string; childName: string; plans: PlanDefinition[]; teams: { id: string; name: string }[]
    defaultTeamId?: string; onComplete?: () => void
}) {
    const router = useRouter()
    const [open,setOpen] = useState(false)
    const [planId,setPlanId] = useState('')
    const [month,setMonth] = useState('')
    const [due,setDue] = useState(5)
    const [discount,setDiscount] = useState(0)
    const [promotion,setPromotion] = useState('')
    const [enrollment,setEnrollment] = useState(false)
    const [plus,setPlus] = useState(0)
    const [team,setTeam] = useState(defaultTeamId)
    const [review,setReview] = useState(false)
    const [busy,setBusy] = useState(false)
    const [requestId,setRequestId] = useState('')
    const plan = plans.find(p=>p.id===planId)
    let preview: ReturnType<typeof previewFamilyPlan> | null = null
    let error = ''
    try { if (plan) preview=previewFamilyPlan(plan,month,due,discount,enrollment,plus) } catch(e) { error=(e as Error).message }
    async function save() {
        if (!plan || !preview || busy) return
        setBusy(true)
        try {
            const result = await assignFamilyPlan({requestId,childId,planId,planVersion:plan.updated_at,startMonth:month,dueDay:due,discount,promotion,enrollment,plus,teamId:team||null})
            if (!result.success) { toast.error(result.error); return }
            toast.success('Plan asignado y cuotas creadas. No se ha realizado ningún cobro.')
            setOpen(false); router.refresh(); onComplete?.()
        } catch { toast.error('No se pudo confirmar la respuesta. Puedes reintentar: no se duplicará la asignación.') }
        finally { setBusy(false) }
    }
    return <>
        <Button size="sm" onClick={()=>{setOpen(true);setReview(false);setRequestId(crypto.randomUUID())}}>Asignar plan</Button>
        <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value)}}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogHeader><DialogTitle>{review?'Revisar asignación':'Asignar plan'} · {childName}</DialogTitle></DialogHeader>
                <p className="text-sm text-slate-600">El plan pertenece a este hijo, no a toda la familia. Genera cuotas pendientes; no cobra tarjetas. Stripe sigue pendiente.</p>
                {!plans.length ? <p className="rounded-lg bg-amber-50 p-4 text-sm">Primero crea las tarifas en <Link className="font-bold underline" href="/admin/ajustes">Ajustes → Planes</Link>. Define actividad, precio, frecuencia y duración. No hay precios inventados.</p> : !review ? <div className="space-y-4">
                    <label className="block text-sm font-medium">1. Actividad y tarifa
                        <select className={field} value={planId} onChange={e=>{setPlanId(e.target.value);setDiscount(0);setEnrollment(false)}}>
                            <option value="">Selecciona un plan</option>
                            {plans.map(p=><option key={p.id} value={p.id}>{p.name} · {euro(p.price)} · {p.frequency} · {p.duration_months} meses</option>)}
                        </select>
                    </label>
                    {plan && <p className="text-sm text-slate-600">{plan.description || 'La duración y el precio se guardarán con esta asignación, aunque después cambie la tarifa.'}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-medium">2. Primer mes completo<input type="month" className={field} value={month} onChange={e=>setMonth(e.target.value)} /></label>
                        <label className="text-sm font-medium">Día de vencimiento<input type="number" min="1" max="28" className={field} value={due} onChange={e=>setDue(Number(e.target.value))}/></label>
                    </div>
                    <p className="text-xs text-slate-500">Sin prorrateo: cada mes se cobra completo. Para altas a mitad de mes, registra ese primer importe por separado y empieza el plan el mes siguiente.</p>
                    <label className="block text-sm font-medium">3. Equipo (opcional)
                        <select className={field} value={team} onChange={e=>setTeam(e.target.value)}>
                            <option value="">Mantener equipo actual / asignar después</option>
                            {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-medium">Descuento por periodo (€)<input type="number" min="0" step="0.01" className={field} value={discount} onChange={e=>setDiscount(Number(e.target.value))}/></label>
                        <label className="text-sm font-medium">Plan Plus · pago único (€)<input type="number" min="0" step="0.01" className={field} value={plus} onChange={e=>setPlus(Number(e.target.value))}/></label>
                    </div>
                    {discount>0 && <label className="block text-sm font-medium">Motivo de la promoción<input maxLength={200} className={field} value={promotion} onChange={e=>setPromotion(e.target.value)}/></label>}
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enrollment} onChange={e=>setEnrollment(e.target.checked)}/> Añadir matrícula una sola vez ({euro(plan?.enrollment_fee||0)})</label>
                    <p className="text-xs text-slate-500">No añadas matrícula ni Plan Plus si ya están pagados. Equipación, campus y torneos se registran como conceptos independientes.</p>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <Button className="w-full" disabled={!preview || (discount>0&&!promotion.trim())} onClick={()=>setReview(true)}>Ver calendario e importes</Button>
                </div> : preview && plan && <div className="space-y-4">
                    <div className="rounded-lg bg-slate-50 p-4 text-sm">
                        <p className="font-bold">{plan.name}</p>
                        <p>{month} → {preview.endDate} · {plan.duration_months} meses</p>
                        <p>Precio por periodo: {euro(plan.price)} · Descuento: {euro(discount)}</p>
                        <p>Matrícula: {euro(preview.enrollmentFee)} · Plus: {euro(plus)}</p>
                        <p className="mt-2 text-lg font-bold">Total del plan: {euro(preview.total)}</p>
                    </div>
                    <p className="text-sm">Los meses de un mismo trimestre o temporada comparten vencimiento. Se mostrarán desglosados para saber qué meses quedan cubiertos.</p>
                    <div className="max-h-56 overflow-auto rounded-lg border"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Mes cubierto</th><th>Vencimiento</th><th>Importe</th></tr></thead><tbody>{preview.rows.map(r=><tr key={r.covered_month} className="border-t"><td className="p-2">{r.covered_month}</td><td>{r.due_date}</td><td>{euro(r.amount)}</td></tr>)}</tbody></table></div>
                    <p className="text-xs text-slate-600">Matrícula y Plus, si los has añadido, vencen el {preview.rows[0]?.due_date}. Si hay cuotas solapadas o pagos antiguos sin mes/concepto identificado, se bloqueará la asignación sin tocar los pagos existentes.</p>
                    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setReview(false)}>Volver</Button><Button disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':'Confirmar y crear cuotas'}</Button></div>
                </div>}
            </DialogContent>
        </Dialog>
    </>
}
