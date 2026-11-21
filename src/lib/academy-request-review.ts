import { z } from 'zod'
import { academyQuote, calendarDate, type AcademyPlan, type AcademyGroup } from '@/lib/offering'

export const academyRequestReviewSchema = z.object({
  startDate: calendarDate,
  chargeEnrollment: z.boolean(),
  revision: z.string().regex(/^[a-f0-9]{32}$/),
})
export type AcademyRequestReviewInput = z.infer<typeof academyRequestReviewSchema>
export type AcademyRequestReviewContext = {
  revision: string
  child_id: string | null
  fee_exempt: boolean
  plus_recorded: boolean
  request: {
    id: string; child_name: string; guardian_name: string; email: string; phone: string
    status: string; notes: string | null; created_at: string
    academy_details: {
      plan: AcademyPlan; groups: AcademyGroup[]; start_date: string; payment_choice: string
      quote: ReturnType<typeof academyQuote>
      admin_completion?: { charge_enrollment: boolean }
    }
  }
}

export function reviewedAcademyQuote(context: AcademyRequestReviewContext, startDate: string, chargeEnrollment: boolean) {
  const d = context.request.academy_details
  return academyQuote({ ...d.plan, enrollment_fee: chargeEnrollment && !context.fee_exempt ? d.plan.enrollment_fee : 0 }, startDate, !context.plus_recorded && d.quote.plus === 50)
}
