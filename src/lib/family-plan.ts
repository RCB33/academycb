import { addBillingMonths, buildMonthlyCharges } from './membership-billing'

export type PlanDefinition = {
    id: string; name: string; description: string; price: number; enrollment_fee: number
    duration_months: number; frequency: string; updated_at: string
}

export function previewFamilyPlan(plan: PlanDefinition, startMonth: string, dueDay: number, discount: number, enrollment: boolean, plus: number) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) throw new Error('Selecciona el mes de inicio')
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw new Error('El vencimiento debe estar entre el día 1 y el 28')
    const interval = plan.frequency === 'temporada' ? plan.duration_months : plan.frequency === 'anual' ? 12 : plan.frequency === 'trimestral' ? 3 : 1
    if (plan.duration_months < 1 || plan.duration_months > 60 || plan.duration_months % interval) throw new Error('La duración debe contener periodos completos. Para un único pago, utiliza un plan de temporada.')
    if (![plan.price, discount, plus].every(n => Number.isFinite(n) && n >= 0 && n <= 1_000_000) || discount > plan.price) throw new Error('Revisa los importes y el descuento')
    const start = new Date(`${startMonth}-01T00:00:00Z`)
    const rows = buildMonthlyCharges(start, plan.duration_months, interval, Math.round((plan.price-discount)*100)/100, dueDay)
    const end = addBillingMonths(start, plan.duration_months)
    end.setUTCDate(end.getUTCDate()-1)
    const enrollmentFee = enrollment ? Number(plan.enrollment_fee) : 0
    return {
        rows, endDate: end.toISOString().slice(0,10),
        total: Math.round((rows.reduce((sum,r)=>sum+r.amount,0)+enrollmentFee+plus)*100)/100,
        enrollmentFee, plus,
    }
}
