export type PaymentHistoryReview = {
  history_review_required?: boolean
  history_reviewed_at?: string | null
  history_review_note?: string | null
}

export function historyReviewPending(m: PaymentHistoryReview) {
  return m.history_review_required === true && !m.history_reviewed_at
}

export function pastIncorporation(date: string, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })) {
  return Boolean(date && date < today)
}

export const historyReviewMessage = 'La incorporación es anterior al alta en la web. Secretaría revisará las cuotas y los pagos ya realizados antes de indicar el importe pendiente. No repitas ningún pago. La tarjeta permanecerá bloqueada hasta terminar esa revisión.'
