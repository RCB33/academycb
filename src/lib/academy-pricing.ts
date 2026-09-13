import { z } from 'zod'
import { eurosToCents } from './payment-rules'

const price = z.number().finite().min(0.5).max(1_000_000).refine(
    value => /^\d+(?:\.\d{1,2})?$/.test(String(value)),
    'El precio admite un máximo de dos decimales.',
)

export const AcademyCheckoutSchema = z.object({
    full_payment_enabled: z.boolean().default(false),
    full_payment_price: price.nullable().default(null),
    monthly_payment_enabled: z.boolean().default(false),
    monthly_payment_price: price.nullable().default(null),
    duration_months: z.number().int().min(1).max(60),
}).superRefine((value, context) => {
    if (value.full_payment_enabled && value.full_payment_price === null) {
        context.addIssue({ code: 'custom', path: ['full_payment_price'], message: 'Indica el precio del pago completo.' })
    }
    if (value.monthly_payment_enabled && value.monthly_payment_price === null) {
        context.addIssue({ code: 'custom', path: ['monthly_payment_price'], message: 'Indica el importe de cada mensualidad.' })
    }
})

// Call only with a plan loaded by the server. Persist this snapshot before Checkout;
// never recalculate an existing contract from the editable membership_plans row.
export function academyPriceSnapshot(input: z.input<typeof AcademyCheckoutSchema> & {
    id: string; name: string; enrollment_fee: number; is_active: boolean
}, choice: 'full' | 'monthly') {
    const plan = AcademyCheckoutSchema.parse(input)
    if (!input.is_active) throw new Error('Este plan está archivado.')
    if (choice !== 'full' && choice !== 'monthly') throw new Error('Modalidad de pago inválida.')
    const enabled = choice === 'full' ? plan.full_payment_enabled : plan.monthly_payment_enabled
    const amount = choice === 'full' ? plan.full_payment_price : plan.monthly_payment_price
    if (!enabled || amount === null) throw new Error('Esta modalidad no está disponible.')
    const unitAmountCents = eurosToCents(amount)
    const enrollmentFeeCents = input.enrollment_fee === 0 ? 0 : eurosToCents(input.enrollment_fee)
    const installments = choice === 'full' ? 1 : plan.duration_months
    const totalAmountCents = unitAmountCents * installments + enrollmentFeeCents
    if (!Number.isSafeInteger(totalAmountCents) || totalAmountCents > 100_000_000) throw new Error('El total del contrato supera el límite permitido.')
    return Object.freeze({
        version: 1 as const, planId: input.id, planName: input.name, currency: 'eur' as const,
        choice, durationMonths: plan.duration_months, installments,
        unitAmountCents, enrollmentFeeCents, firstPaymentCents: unitAmountCents + enrollmentFeeCents,
        totalAmountCents, autoRenew: false as const,
    })
}
