export const academyPaymentMessage = 'Para Academia solo se acepta efectivo o tarjeta con Stripe.'
export const combinedEnrollmentMessage = 'Solicitud de Academia + Campus. Secretaría contactará contigo para concretar las actividades y la forma de pago. Enviar la solicitud no confirma plazas ni realiza ningún cobro.'

export function isCombinedEnrollment(children: { service: string; campus_interest?: string }[]) {
    return children.some(child => child.service === 'academy') &&
        children.some(child => child.service === 'campus' || (child.service === 'academy' && child.campus_interest === 'yes'))
}

export function enrollmentPaymentLabel(choice: string | undefined) {
    if (choice === 'monthly_card') return 'Tarjeta con Stripe'
    if (choice === 'cash') return 'Efectivo'
    if (choice === 'transfer') return 'Transferencia bancaria'
    return 'Pendiente de concretar con la familia'
}
