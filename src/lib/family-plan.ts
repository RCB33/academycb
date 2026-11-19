import { addBillingMonths, buildMonthlyCharges } from './membership-billing'
import { firstMonthPercent } from './offering'

export type PlanDefinition = {
    id: string; name: string; description: string; price: number; enrollment_fee: number
    duration_months: number; frequency: string; updated_at: string
    season_start?: string | null; season_end?: string | null; sessions_per_week?: number | null
}
export type AssignmentTeam = {id:string;name:string;schedule?:string;public_offer?:{kind?:string;day?:string;published?:boolean}|null}

export function previewFamilyPlan(plan: PlanDefinition, startDate: string, dueDay: number, discount: number, enrollment: boolean, plus: number, today = new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})) {
    const start = new Date(`${startDate}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(start.getTime()) || start.toISOString().slice(0,10)!==startDate) throw new Error('Selecciona la fecha de incorporación')
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw new Error('Revisa el vencimiento')
    const monthly=plan.frequency==='mensual'
    if (monthly && dueDay!==1) throw new Error('Las mensualidades vencen el día 1')
    if (!monthly && start.getUTCDate()!==1) throw new Error('El plan debe empezar el primer día del mes')
    const interval = plan.frequency === 'temporada' ? plan.duration_months : plan.frequency === 'anual' ? 12 : plan.frequency === 'trimestral' ? 3 : 1
    if (plan.duration_months < 1 || plan.duration_months > 60 || plan.duration_months % interval) throw new Error('La duración debe contener periodos completos. Para un único pago, utiliza un plan de temporada.')
    if (![plan.price, discount, plus].every(n => Number.isFinite(n) && n >= 0 && n <= 1_000_000) || discount > plan.price) throw new Error('Revisa los importes y el descuento')
    const origin = new Date(`${startDate.slice(0,7)}-01T00:00:00Z`)
    let duration = plan.duration_months
    if (plan.season_start || plan.season_end) {
        if (!plan.season_start || !plan.season_end || !monthly) throw new Error('Revisa las fechas de temporada del plan')
        const seasonEnd = new Date(`${plan.season_end}T00:00:00Z`)
        if (startDate < plan.season_start || startDate > plan.season_end) throw new Error('La incorporación debe estar dentro de la temporada')
        duration = (seasonEnd.getUTCFullYear()-origin.getUTCFullYear())*12+seasonEnd.getUTCMonth()-origin.getUTCMonth()+1
        if (!Number.isInteger(duration) || duration < 1 || duration > plan.duration_months || addBillingMonths(origin,duration).getTime()-86400000 !== seasonEnd.getTime()) throw new Error('La temporada debe finalizar el último día del mes')
    }
    const percent=monthly?firstMonthPercent(startDate):100
    const rows = buildMonthlyCharges(origin, duration, interval, Math.round((plan.price-discount)*100)/100, dueDay)
    if(monthly){rows[0].amount=Math.round(rows[0].amount*percent)/100;rows[0].due_date=startDate>today?startDate:today}
    const end = addBillingMonths(origin, duration)
    end.setUTCDate(end.getUTCDate()-1)
    const enrollmentFee = enrollment ? Number(plan.enrollment_fee) : 0
    return { rows, percent, durationMonths: duration, endDate: end.toISOString().slice(0,10),
        total: Math.round((rows.reduce((sum,r)=>sum+r.amount,0)+enrollmentFee+plus)*100)/100,
        firstTotal:Math.round((rows.filter(r=>r.due_date===rows[0].due_date).reduce((sum,r)=>sum+r.amount,0)+enrollmentFee+plus)*100)/100,enrollmentFee, plus }
}
