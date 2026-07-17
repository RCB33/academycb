export type BillingFrequency = 'mensual' | 'trimestral' | 'anual'

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

    if (normalizedFrequency === 'anual') return 'anual'
    if (normalizedFrequency === 'trimestral') return 'trimestral'
    return 'mensual'
}

export function getBillingIntervalMonths(frequency: BillingFrequency) {
    if (frequency === 'anual') return 12
    if (frequency === 'trimestral') return 3
    return 1
}

export function getBillingSuffix(frequency: BillingFrequency) {
    if (frequency === 'anual') return 'año'
    if (frequency === 'trimestral') return 'trim.'
    return 'mes'
}
