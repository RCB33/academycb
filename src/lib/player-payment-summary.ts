import { receiptBalance, type ReceiptAllocation } from './receipt-balance'

type Receipt = { amount: number | string | null; status: string; manual_receipt_allocations?: ReceiptAllocation[] | null }
type Summary = { label: string; detail: string; tone: 'neutral' | 'pending' | 'paid'; paid: number; remaining: number }
const money = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)

// This describes existing receipts only. It cannot assert that every expected
// monthly fee has been issued or that the player is up to date for the season.
export function playerPaymentSummary(payments: Receipt[], error?: string): Summary {
    const neutral = (label: string, detail: string): Summary => ({ label, detail, tone: 'neutral', paid: 0, remaining: 0 })
    if (error) return neutral('No disponible', error)
    if (!payments.length) return neutral('Sin recibos creados', 'Todavía no hay recibos registrados para este jugador. Esto no significa que haya pagado.')
    const active = payments.filter(p => !['cancelled', 'refunded'].includes(p.status))
    if (!active.length) return neutral('Sin recibos activos', 'Solo constan recibos anulados o devueltos; no acreditan estar al corriente.')
    if (active.some(p => p.amount == null || !Number.isFinite(Number(p.amount)) || Number(p.amount) < 0 || !['pending', 'overdue', 'failed', 'paid'].includes(p.status))) {
        return neutral('Revisar recibos', 'Hay recibos con datos que necesitan revisión.')
    }
    const balances = active.map(receiptBalance)
    if (balances.some(b => !Number.isFinite(b.paid) || !Number.isFinite(b.remaining) || b.paid < 0)) return neutral('Revisar recibos', 'No se pudo calcular el saldo de los recibos.')
    const paid = balances.reduce((sum, b) => sum + Math.round(b.paid * 100), 0) / 100
    const remaining = balances.reduce((sum, b) => sum + Math.round(b.remaining * 100), 0) / 100
    if (remaining > 0) return {
        label: paid > 0 ? 'Cobro parcial' : 'Pendiente de cobro', tone: 'pending', paid, remaining,
        detail: `${money(remaining)} pendientes en los recibos creados. ${paid > 0 ? `${money(paid)} constan cobrados.` : 'No consta ningún cobro en estos recibos.'}`,
    }
    if (paid === 0) return neutral('Sin importe a cobrar', 'Los recibos activos tienen importe cero. No consta ningún cobro en ellos.')
    const collected = balances.filter(b => b.paid > 0 && b.remaining === 0).length
    return { label: 'Cobros registrados', tone: 'paid', paid, remaining, detail: `${money(paid)} constan cobrados en ${collected} ${collected === 1 ? 'recibo' : 'recibos'}.` }
}
