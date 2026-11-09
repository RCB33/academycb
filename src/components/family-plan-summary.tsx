'use client'
import { useT } from '@/lib/i18n/client'


import { receiptBalance, type ReceiptAllocation } from '@/lib/receipt-balance'

export type FamilyMembership = {
    id: string; child_id: string; start_date: string; end_date: string; status: string
    monthly_price: number | null
    plan_snapshot: { name: string; frequency: string; period_price: number; discount_per_period: number } | null
    plan: { name: string; frequency: string } | null
}
export type FamilyPayment = {
    id: string; child_id: string; ref_id: string | null; amount: number; status: string
    type: string; concept_code: string | null
    description: string | null; due_date: string | null; covered_month: string | null
    manual_receipt_allocations: ReceiptAllocation[]
}
const euro = (n: number) => n.toLocaleString('es-ES',{style:'currency',currency:'EUR'})
export function FamilyPlanSummary({students, memberships, payments}: {
    students: {id:string;full_name:string}[]; memberships: FamilyMembership[]; payments: FamilyPayment[]
}) {
    const translate = useT()

    const pending = payments.reduce((sum,p)=>sum+receiptBalance(p).remaining,0)
    return <section className="space-y-4">
        <div className="rounded-xl bg-navy p-5 text-white"><h2 className="text-lg font-bold">{translate("Planes y cuotas de la familia")}</h2><p className="mt-1">{translate("Saldo pendiente registrado: ")}<strong>{translate(euro(pending))}</strong></p><p className="mt-1 text-xs text-slate-300">{translate("Incluye cuotas futuras. Asignar un plan no equivale a haberlo pagado.")}</p></div>
        {translate(students.map(child=>{
            const childPlans=memberships.filter(m=>m.child_id===child.id)
            const childPayments=payments.filter(p=>p.child_id===child.id)
            const remaining=childPayments.reduce((s,p)=>s+receiptBalance(p).remaining,0)
            const paid=childPayments.filter(p=>!['cancelled','refunded'].includes(p.status)).reduce((s,p)=>s+receiptBalance(p).paid,0)
            const next=childPayments.filter(p=>receiptBalance(p).remaining>0&&p.due_date).sort((a,b)=>a.due_date!.localeCompare(b.due_date!))[0]
            const legacy=childPayments.filter(p=>p.type==='academy'&&!p.covered_month&&(!p.concept_code||p.concept_code==='monthly')&&!['cancelled','refunded'].includes(p.status)&&Number(p.amount)>0)
            return <div key={child.id} className="rounded-xl border bg-white p-5">
                <h3 className="font-bold">{translate(child.full_name)}</h3>
                {translate(!childPlans.length && <p className="mt-2 text-sm text-slate-500">{translate("Sin plan asignado. Los pagos ya registrados se conservan.")}</p>)}
                {translate(legacy.length>0 && <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{translate(legacy.length)} {translate(" pago(s) anterior(es) sin concepto o mes identificado. Administración debe revisar qué cubren antes de asignar nuevas cuotas; estos importes no se han convertido automáticamente en meses pagados.")}</p>)}
                {translate(childPlans.map(m=><div key={m.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-semibold">{translate(m.plan_snapshot?.name||m.plan?.name||'Plan de academia')}</p>
                    <p>{translate(m.start_date)} {translate(" → ")}{translate(m.end_date)} {translate(" · ")}{translate(m.plan_snapshot?.frequency||m.plan?.frequency)} {translate(" · ")}{translate(m.status==='active'?'Activo':m.status==='cancelled'?'Anulado':m.status==='paused'?'Pausado':'Pendiente')}</p>
                    <p>{translate(euro(Number(m.monthly_price||0)))} {translate(" por periodo")}</p>
                </div>))}
                <p className="mt-3 text-sm">{translate("Abonado: ")}<strong>{translate(euro(paid))}</strong> {translate(" · Pendiente: ")}<strong>{translate(euro(remaining))}</strong></p>
                {translate(next && <p className="mt-1 text-sm text-slate-600">{translate("Primer vencimiento pendiente: ")}{translate(next.due_date)}</p>)}
                {translate(childPayments.length>0 && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">{translate("Ver meses, conceptos e historial (")}{translate(childPayments.length)}{translate(")")}</summary><ul className="mt-2 divide-y">
                    {translate([...childPayments].sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||'')).map(p=>{
                        const balance=receiptBalance(p)
                        const status=p.status==='cancelled'?'Anulado':p.status==='refunded'?'Reembolsado':balance.remaining===0?(Number(p.amount)===0?'Bonificado':'Pagado'):balance.partial?'Parcial':'Pendiente'
                        return <li key={p.id} className="py-2 text-sm"><p>{translate(p.covered_month?`${p.covered_month} · `:'')}{translate(p.description||'Cuota')}</p><p className="text-slate-600">{translate(status)} {translate(" · ")}{translate(euro(Number(p.amount)))} {translate(" · Pendiente ")}{translate(euro(balance.remaining))}{translate(p.due_date?` · Vence ${p.due_date}`:'')}</p></li>
                    }))}
                </ul></details>)}
            </div>
        }))}
    </section>
}
