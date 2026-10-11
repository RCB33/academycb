export const PAYMENT_CONCEPTS = { monthly: 'Mensualidad', registration: 'Matrícula', plus: 'Plan Plus', kit: 'Equipación', tournament: 'Torneo', campus: 'Campus', other: 'Otro' } as const
export function paymentMethodLabel(method: string | null) {
    return ({ cash: 'Efectivo', efectivo: 'Efectivo', transfer: 'Transferencia', transferencia: 'Transferencia', stripe: 'Tarjeta / Stripe', tarjeta: 'Tarjeta', bizum: 'Bizum', external_card: 'Tarjeta externa' } as Record<string,string>)[method || ''] || 'Sin método registrado'
}
