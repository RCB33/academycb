export type BillingFrequency = 'mensual' | 'trimestral' | 'anual' | 'temporada'

/** Calendar arithmetic: clamp the day instead of overflowing into the next month. */
export function addBillingMonths(date: Date, months: number): Date {
    const result = new Date(date)
    const day = result.getUTCDate()
    result.setUTCDate(1)
    result.setUTCMonth(result.getUTCMonth() + months)
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
    result.setUTCDate(Math.min(day, lastDay))
    return result
}

export function billingDueDate(start: Date, offsetMonths: number, dueDay: number): string {
    const date = addBillingMonths(start, offsetMonths)
    if (offsetMonths > 0 || start.getUTCDate() <= dueDay) date.setUTCDate(Math.min(28, Math.max(1, dueDay)))
    return date.toISOString().slice(0, 10)
}

/** Split a period price into explicit months without losing or inventing cents. */
export function buildMonthlyCharges(start: Date, duration: number, interval: number, periodPrice: number, dueDay: number) {
    const rows: { amount: number; covered_month: string; due_date: string }[] = []
    for (let offset = 0; offset < duration; offset += interval) {
        const count = Math.min(interval, duration - offset)
        const cents = Math.round(periodPrice * 100)
        for (let index = 0; index < count; index++) {
            rows.push({
                amount: (Math.floor(cents / count) + (index < cents % count ? 1 : 0)) / 100,
                covered_month: addBillingMonths(start, offset + index).toISOString().slice(0, 7),
                due_date: billingDueDate(start, offset, dueDay),
            })
        }
    }
    return rows
}

export function normalizeBillingFrequency(
    frequency?: string | null,
    durationMonths?: number | null,
    planName?: string | null
): BillingFrequency {
    const normalizedFrequency = frequency?.trim().toLowerCase()
    const normalizedName = planName?.trim().toLowerCase() || ''

    // Protect old seeded plans whose frequency was accidentally defaulted to monthly.
    if (normalizedName === 'anual' && durationMonths === 12) return 'anual'
    if (normalizedName === 'trimestral' && durationMonths === 3) return 'trimestral'

    if (normalizedFrequency === 'temporada') return 'temporada'
    if (normalizedFrequency === 'anual') return 'anual'
    if (normalizedFrequency === 'trimestral') return 'trimestral'
    return 'mensual'
}

export function getBillingIntervalMonths(frequency: BillingFrequency, durationMonths = 12) {
    if (frequency === 'temporada') return durationMonths
    if (frequency === 'anual') return 12
    if (frequency === 'trimestral') return 3
    return 1
}

export function getBillingSuffix(frequency: BillingFrequency) {
    if (frequency === 'temporada') return 'temporada'
    if (frequency === 'anual') return 'año'
    if (frequency === 'trimestral') return 'trim.'
    return 'mes'
}
