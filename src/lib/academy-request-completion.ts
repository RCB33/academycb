import { z } from 'zod'
import { academyQuote, calendarDate, type AcademyOffer } from '@/lib/offering'
import type { AcademyRequestReviewContext } from '@/lib/academy-request-review'

export const academyCompletionSchema = z.object({
  planId: z.string().uuid(), groupId: z.string().uuid(), secondGroupId: z.union([z.string().uuid(), z.literal('')]),
  startDate: calendarDate, chargeEnrollment: z.boolean(), plus: z.boolean(),
  paymentChoice: z.enum(['cash', 'monthly_card']), offerVersion: z.string().min(1), revision: z.string().regex(/^[a-f0-9]{32}$/),
})
export type AcademyCompletionInput = z.infer<typeof academyCompletionSchema>
export type AcademyCompletionContext = { revision: string; request: {
  id: string; child_name: string; birth_date: string; guardian_name: string; email: string; phone: string; notes: string | null
  academy_details: AcademyRequestReviewContext['request']['academy_details'] | null
} }
export function groupFitsBirthYear(birthDate: string, from: number | null, to: number | null) {
  const year = Number(birthDate.slice(0, 4))
  return from === null || to === null || (year >= from && year <= to)
}
export function completeAcademyDetails(offer: AcademyOffer, input: AcademyCompletionInput, birthDate: string) {
  if (input.offerVersion !== offer.version) throw Error('Los precios u horarios han cambiado. Recarga antes de guardar.')
  const plan = offer.plans.find(p => p.id === input.planId && p.is_active)
  const first = offer.groups.find(g => g.id === input.groupId)
  const second = offer.groups.find(g => g.id === input.secondGroupId)
  if (!plan || !first) throw Error('Elige un plan y un grupo disponibles.')
  if (plan.sessions_per_week === 1 && input.secondGroupId) throw Error('Este plan incluye un solo grupo.')
  if (plan.sessions_per_week === 2 && (!second || second.id === first.id || second.public_offer.kind !== 'sunday' || first.public_offer.kind === 'sunday')) throw Error('Elige un grupo entre semana y otro el domingo.')
  const groups = plan.sessions_per_week === 2 ? [first, second!] : [first]
  if (groups.some(g => g.status !== 'active' || !g.public_offer.published || !groupFitsBirthYear(birthDate, g.public_offer.birth_from, g.public_offer.birth_to))) throw Error('Revisa los grupos disponibles para su año de nacimiento.')
  const quote = academyQuote({ ...plan, enrollment_fee: input.chargeEnrollment ? plan.enrollment_fee : 0 }, input.startDate, input.plus)
  return { version: offer.version, plan, groups, start_date: input.startDate, payment_choice: input.paymentChoice, quote }
}
