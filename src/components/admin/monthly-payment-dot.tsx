import type { MonthlyStatus } from '@/lib/monthly-payment-status'
const labels={paid:'Pagado',partial:'Pago parcial',pending:'Pendiente',waived:'Bonificado',missing:'Sin cuota creada'}
const colors={paid:'bg-emerald-500',partial:'bg-amber-500',pending:'bg-rose-500',waived:'bg-sky-500',missing:'bg-slate-300'}
export function MonthlyPaymentDot({status}:{status:MonthlyStatus}) {
    return <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[status]}`}/>{labels[status]}</span>
}
