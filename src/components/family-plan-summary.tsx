import { receiptBalance, type ReceiptAllocation } from '@/lib/receipt-balance'

export type FamilyMembership = {
    id: string; child_id: string; start_date: string; end_date: string; status: string
    monthly_price: number | null
    plan_snapshot: { name: string; frequency: string; period_price: number; discount_per_period: number } | null
    plan: { name: string; frequency: string } | null
}
export type FamilyPayment = {
    id: string; child_id: string; ref_id: string | null; amount: number; status: string
    description: string | null; due_date: string | null; covered_month: string | null
    manual_receipt_allocations: ReceiptAllocation[]
}
const euro = (n: number) => n.toLocaleString('es-ES',{style:'currency',currency:'EUR'})
export function FamilyPlanSummary({students, memberships, payments}: {
    students: {id:string;full_name:string}[]; memberships: FamilyMembership[]; payments: FamilyPayment[]
}) {
    const pending = payments.reduce((sum,p)=>sum+receiptBalance(p).remaining,0)
    return <section className="space-y-4">
        <div className="rounded-xl bg-navy p-5 text-white"><h2 className="text-lg font-bold">Planes y cuotas de la familia</h2><p className="mt-1">Saldo pendiente registrado: <strong>{euro(pending)}</strong></p><p className="mt-1 text-xs text-slate-300">Incluye cuotas futuras. Asignar un plan no equivale a haberlo pagado.</p></div>
        {students.map(child=>{
            const childPlans=memberships.filter(m=>m.child_id===child.id)
            const childPayments=payments.filter(p=>p.child_id===child.id)
            const remaining=childPayments.reduce((s,p)=>s+receiptBalance(p).remaining,0)
            const paid=childPayments.filter(p=>!['cancelled','refunded'].includes(p.status)).reduce((s,p)=>s+receiptBalance(p).paid,0)
            const next=childPayments.filter(p=>receiptBalance(p).remaining>0&&p.due_date).sort((a,b)=>a.due_date!.localeCompare(b.due_date!))[0]
            return <div key={child.id} className="rounded-xl border bg-white p-5">
                <h3 className="font-bold">{child.full_name}</h3>
                {!childPlans.length && <p className="mt-2 text-sm text-slate-500">Sin plan asignado. Los pagos ya registrados se conservan.</p>}
                {childPlans.map(m=><div key={m.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-semibold">{m.plan_snapshot?.name||m.plan?.name||'Plan de academia'}</p>
                    <p>{m.start_date} → {m.end_date} · {m.plan_snapshot?.frequency||m.plan?.frequency} · {m.status==='active'?'Activo':m.status==='cancelled'?'Anulado':m.status==='paused'?'Pausado':'Pendiente'}</p>
                    <p>{euro(Number(m.monthly_price||0))} por periodo</p>
                </div>)}
                <p className="mt-3 text-sm">Abonado: <strong>{euro(paid)}</strong> · Pendiente: <strong>{euro(remaining)}</strong></p>
                {next && <p className="mt-1 text-sm text-slate-600">Primer vencimiento pendiente: {next.due_date}</p>}
                {childPayments.length>0 && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Ver meses, conceptos e historial ({childPayments.length})</summary><ul className="mt-2 divide-y">
                    {[...childPayments].sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||'')).map(p=>{
                        const balance=receiptBalance(p)
                        const status=p.status==='cancelled'?'Anulado':p.status==='refunded'?'Reembolsado':balance.remaining===0?(Number(p.amount)===0?'Bonificado':'Pagado'):balance.partial?'Parcial':'Pendiente'
                        return <li key={p.id} className="py-2 text-sm"><p>{p.covered_month?`${p.covered_month} · `:''}{p.description||'Cuota'}</p><p className="text-slate-600">{status} · {euro(Number(p.amount))} · Pendiente {euro(balance.remaining)}{p.due_date?` · Vence ${p.due_date}`:''}</p></li>
                    })}
                </ul></details>}
            </div>
        })}
    </section>
}
