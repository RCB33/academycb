'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { assignFamilyPlan } from '@/app/actions/family-plans'
import { previewFamilyPlan, type AssignmentTeam, type PlanDefinition } from '@/lib/family-plan'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const euro = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
const field = 'mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm'
export function FamilyPlanAssignment({ childId, childName, plans, teams, defaultTeamId = '', onComplete }: {
    childId: string; childName: string; plans: PlanDefinition[]; teams: AssignmentTeam[]
    defaultTeamId?: string; onComplete?: () => void
}) {
    const router = useRouter()
    const [open,setOpen] = useState(false)
    const [paymentMethod,setPaymentMethod]=useState<'cash'|'stripe'>('cash')
    const [planId,setPlanId] = useState('')
    const [startDate,setStartDate] = useState(new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'}))
    const [due,setDue] = useState(1)
    const [discount,setDiscount] = useState(0)
    const [promotion,setPromotion] = useState('')
    const [enrollment,setEnrollment] = useState(false)
    const [plus,setPlus] = useState<0 | 50>(0)
    const [team,setTeam] = useState(defaultTeamId)
    const [secondTeam,setSecondTeam] = useState('')
    const [review,setReview] = useState(false)
    const [busy,setBusy] = useState(false)
    const [requestId,setRequestId] = useState('')
    const plan = plans.find(p=>p.id===planId)
    let preview: ReturnType<typeof previewFamilyPlan> | null = null
    const needsTwo=plan?.sessions_per_week===2
    const missingGroup=!!plan?.sessions_per_week&&(!team||(needsTwo&&!secondTeam))
    const groupLabel=(t:AssignmentTeam)=>[t.public_offer?.day,t.name,t.schedule].filter(Boolean).join(' · ')
    let error = ''
    try { if (plan) preview=previewFamilyPlan(plan,startDate,plan.frequency==='mensual'?1:due,discount,enrollment,plus) } catch(e) { error=(e as Error).message }
    async function save() {
        if (!plan || !preview || busy) return
        setBusy(true)
        try {
            const result = await assignFamilyPlan({paymentMethod,requestId,childId,planId,planVersion:plan.updated_at,startDate,dueDay:plan.frequency==='mensual'?1:due,discount,promotion,enrollment,plus,teamId:team||null,secondTeamId:needsTwo?secondTeam||null:null})
            if (!result.success) { toast.error(result.error); return }
            toast.success(result.notice||'Plan asignado y cuotas pendientes creadas.')
            setOpen(false); router.refresh(); onComplete?.()
        } catch { toast.error('No se pudo confirmar la respuesta. Puedes reintentar: no se duplicará la asignación.') }
        finally { setBusy(false) }
    }
    return <>
        <Button size="sm" onClick={()=>{setOpen(true);setReview(false);setRequestId(crypto.randomUUID())}}>Asignar plan</Button>
        <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value)}}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogHeader><DialogTitle>{review?'Revisar asignación':'Asignar plan'} · {childName}</DialogTitle></DialogHeader>
                <p className="text-sm text-slate-600">El plan pertenece a este hijo, no a toda la familia. Genera cuotas pendientes; no cobra tarjetas automáticamente. El pago inicial, matrícula y extras se gestionan en efectivo. Solo las mensualidades de Academia podrán usar suscripción cuando esté habilitada.</p>
                {!plans.length ? <p className="rounded-lg bg-amber-50 p-4 text-sm">Primero crea las tarifas en <Link className="font-bold underline" href="/admin/ajustes">Ajustes → Planes</Link>. Define actividad, precio, frecuencia y duración. No hay precios inventados.</p> : !review ? <div className="space-y-4">
                    <label className="block text-sm font-medium">1. Actividad y tarifa
                        <select className={field} value={planId} onChange={e=>{setPlanId(e.target.value);setDiscount(0);setEnrollment(false);setTeam('');setSecondTeam('');if(plans.find(p=>p.id===e.target.value)?.frequency!=='mensual')setStartDate(startDate.slice(0,7)+'-01')}}>
                            <option value="">Selecciona un plan</option>
                            {plans.map(p=><option key={p.id} value={p.id}>{p.name} · {euro(p.price)} · {p.frequency} · {p.season_end ? `hasta ${p.season_end}` : `${p.duration_months} meses`}</option>)}
                        </select>
                    </label>
                    {plan && <p className="text-sm text-slate-600">{plan.description || 'La duración y el precio se guardarán con esta asignación, aunque después cambie la tarifa.'}</p>}
                    {plan?.season_end && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Temporada {plan.season_start} → {plan.season_end}. Solo se generan las mensualidades restantes, nunca meses posteriores al final del curso.</p>}
                    <label className="block text-sm font-medium">Forma de pago acordada<select className={field} value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as 'cash'|'stripe')}><option value="cash">Efectivo</option><option value="stripe">Tarjeta · suscripción mensual con Stripe</option></select></label>
                    <label className="block text-sm font-medium">2. Fecha de incorporación<input type="date" className={field} min={plan?.season_start||undefined} max={plan?.season_end||undefined} value={startDate} onChange={e=>setStartDate(e.target.value)} /></label>
                    {plan?.frequency==='mensual'?<p className="rounded-lg bg-blue-50 p-3 text-sm">Primera cuota: 1–7, 100 % · 8–15, 75 % · 16–22, 50 % · 23–fin, 25 %. Después, día 1 de cada mes; seguimiento desde el día 5.</p>:<label className="block text-sm">Día de vencimiento<input type="number" min="1" max="28" className={field} value={due} onChange={e=>setDue(Number(e.target.value))}/></label>}
                    <label className="block text-sm font-medium">3. Grupo {plan?.sessions_per_week?'y horario':'(opcional)'}
                        <select className={field} value={team} onChange={e=>setTeam(e.target.value)}>
                            <option value="">{plan?.sessions_per_week?'Elige el grupo':'Mantener equipo actual / asignar después'}</option>
                            {teams.filter(t=>(!plan?.sessions_per_week||t.public_offer?.published)&&(!needsTwo||t.public_offer?.kind!=='sunday')).map(t=><option key={t.id} value={t.id}>{groupLabel(t)}</option>)}
                        </select>
                    </label>
                    {needsTwo&&<label className="block text-sm font-medium">Segunda sesión · domingo<select className={field} value={secondTeam} onChange={e=>setSecondTeam(e.target.value)}><option value="">Elige el grupo del domingo</option>{teams.filter(t=>t.public_offer?.published&&t.public_offer.kind==='sunday').map(t=><option key={t.id} value={t.id}>{groupLabel(t)}</option>)}</select></label>}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-medium">Descuento por periodo (€)<input type="number" min="0" step="0.01" className={field} value={discount} onChange={e=>setDiscount(Number(e.target.value))}/></label>
                        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={plus === 50} onChange={e=>setPlus(e.target.checked ? 50 : 0)}/> Añadir Plan Plus · 50 € al año</label>
                    </div>
                    {discount>0 && <label className="block text-sm font-medium">Motivo de la promoción<input maxLength={200} className={field} value={promotion} onChange={e=>setPromotion(e.target.value)}/></label>}
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enrollment} onChange={e=>setEnrollment(e.target.checked)}/> Añadir matrícula una sola vez ({euro(plan?.enrollment_fee||0)})</label>
                    <p className="text-xs text-slate-500">Matrícula: solo para nuevos jugadores y si no está pagada. Plan Plus: 50 € en un único pago anual, solo si la familia lo elige y no está ya registrado este año. Equipación, campus y torneos son conceptos independientes.</p>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <Button className="w-full" disabled={!preview || missingGroup || (discount>0&&!promotion.trim())} onClick={()=>setReview(true)}>Ver calendario e importes</Button>
                </div> : preview && plan && <div className="space-y-4">
                    <div className="rounded-lg bg-slate-50 p-4 text-sm">
                        <p className="font-bold">{plan.name}</p><p>Forma de pago: {paymentMethod==='cash'?'Efectivo':'Tarjeta · Stripe (requiere autorización de la familia)'}</p>
                        <p>{startDate} → {preview.endDate} · {preview.durationMonths} meses</p>
                        <p>Primera cuota: {preview.percent} % · {euro(preview.rows[0].amount)}</p><p>Primer pago con extras: {euro(preview.firstTotal)}</p><p>{[team,needsTwo?secondTeam:null].filter(Boolean).map(id=>teams.find(t=>t.id===id)).filter((t):t is AssignmentTeam=>!!t).map(groupLabel).join(" / ")}</p><p>Precio por periodo: {euro(plan.price)} · Descuento: {euro(discount)}</p>
                        <p>Matrícula: {euro(preview.enrollmentFee)} · Plus: {euro(plus)}</p>
                        <p className="mt-2 text-lg font-bold">Total del plan: {euro(preview.total)}</p>
                    </div>
                    <p className="text-sm">El primer pago vence en la fecha de incorporación (o hoy, si es anterior). Las siguientes mensualidades vencen el día 1. Los planes no mensuales se agrupan por periodo.</p>
                    <div className="max-h-56 overflow-auto rounded-lg border"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Mes cubierto</th><th>Vencimiento</th><th>Importe</th></tr></thead><tbody>{preview.rows.map(r=><tr key={r.covered_month} className="border-t"><td className="p-2">{r.covered_month}</td><td>{r.due_date}</td><td>{euro(r.amount)}</td></tr>)}</tbody></table></div>
                    <p className="text-xs text-slate-600">Matrícula y Plus, si los has añadido, vencen el {preview.rows[0]?.due_date}. Si hay cuotas solapadas o pagos antiguos sin mes/concepto identificado, se bloqueará la asignación sin tocar los pagos existentes.</p>
                    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setReview(false)}>Volver</Button><Button disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':'Confirmar plaza y avisar al tutor'}</Button></div>
                </div>}
            </DialogContent>
        </Dialog>
    </>
}
