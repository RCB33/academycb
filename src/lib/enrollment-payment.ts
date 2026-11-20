export type PaymentService = 'academy' | 'campus' | 'tournament'
export type EnrollmentPayment = 'monthly_card' | 'cash' | 'transfer'
export const paymentServices: PaymentService[] = ['academy', 'campus', 'tournament']
export const paymentServiceLabels = { academy: 'Academia', campus: 'Campus', tournament: 'Torneos' }
export const allowedEnrollmentPayments: Record<PaymentService, readonly EnrollmentPayment[]> = {
    academy: ['monthly_card', 'cash'], campus: ['transfer', 'cash'], tournament: ['transfer'],
}
export const academyPaymentMessage = 'Para Academia solo se acepta efectivo o tarjeta con Stripe.'
export const campusPaymentMessage = 'Para Campus solo se acepta transferencia bancaria o efectivo.'
export const tournamentPaymentMessage = 'Para Torneos solo se acepta transferencia bancaria.'
export const paymentMessages = { academy: academyPaymentMessage, campus: campusPaymentMessage, tournament: tournamentPaymentMessage }
export function isAllowedEnrollmentPayment(service: PaymentService, value: unknown): value is EnrollmentPayment {
    return typeof value === 'string' && (allowedEnrollmentPayments[service] as readonly string[]).includes(value)
}
export function enrollmentPaymentLabel(choice: unknown) {
    if (choice === 'monthly_card') return 'Tarjeta con Stripe'
    if (choice === 'cash') return 'Efectivo'
    if (choice === 'transfer') return 'Transferencia bancaria'
    return 'Pendiente de concretar con la familia'
}
export type PaymentRequest = { service: string; academy_details?: { payment_choice?: unknown; requested_payments?: unknown } | null; campus_details?: { payment_choice?: unknown } | null }
export function requestedPaymentChoices(request: PaymentRequest): Partial<Record<PaymentService, EnrollmentPayment>> {
    const result: Partial<Record<PaymentService, EnrollmentPayment>> = {}
    const stored = request.academy_details?.requested_payments
    if (request.service === 'academy' && stored && typeof stored === 'object') {
        for (const service of paymentServices) {
            const choice = (stored as Record<string, unknown>)[service]
            if (isAllowedEnrollmentPayment(service, choice)) result[service] = choice
        }
    }
    const primary = request.service
    const choice = primary === 'academy' ? request.academy_details?.payment_choice : request.campus_details?.payment_choice
    if ((primary === 'academy' || primary === 'campus') && isAllowedEnrollmentPayment(primary, choice)) result[primary] = choice
    if (primary === 'tournament') result.tournament = 'transfer'
    return result
}
export function paymentChoicesText(choices: Partial<Record<PaymentService, EnrollmentPayment>>) {
    return paymentServices.filter(service => choices[service]).map(service => `${paymentServiceLabels[service]}: ${enrollmentPaymentLabel(choices[service])}`).join('\n')
}
