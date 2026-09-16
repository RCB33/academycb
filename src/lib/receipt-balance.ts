export type ReceiptAllocation = { id?: string; batch_id?: string; amount: number | string; paid_date: string; method: string; voided_at: string | null }
export function receiptBalance(payment: { amount: number | string | null; status: string; manual_receipt_allocations?: ReceiptAllocation[] | null }) {
    const total = Math.round(Number(payment.amount || 0) * 100)
    const allocations = payment.manual_receipt_allocations || []
    const paid = allocations.length
        ? allocations.filter(a => !a.voided_at).reduce((sum, a) => sum + Math.round(Number(a.amount) * 100), 0)
        : payment.status === 'paid' ? total : 0
    const remaining = ['cancelled', 'refunded'].includes(payment.status) ? 0 : Math.max(0, total - paid)
    return { paid: paid / 100, remaining: remaining / 100, partial: paid > 0 && remaining > 0, hasAllocations: allocations.length > 0 }
}
