'use client'

import { useState } from 'react'
import { monthlyPaymentStatus, type MonthlyReceipt } from '@/lib/monthly-payment-status'
import { receiptBalance } from '@/lib/receipt-balance'
import { MonthlyPaymentDot } from './monthly-payment-dot'

const money = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
const monthName = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString('es-ES', { month: 'long' })
const colors = {
    paid: 'border-emerald-200 bg-emerald-50',
    partial: 'border-amber-200 bg-amber-50',
    pending: 'border-rose-200 bg-rose-50',
    waived: 'border-sky-200 bg-sky-50',
    missing: 'border-slate-200 bg-slate-50',
}

export function PlayerMonthlyPayments({ payments, onViewPayments }: { payments: MonthlyReceipt[]; onViewPayments: () => void }) {
    const [currentMonth] = useState(() => {
        const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
        return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`
    })
    const [season, setSeason] = useState(() => Number(currentMonth.slice(0, 4)) - (Number(currentMonth.slice(5, 7)) < 9 ? 1 : 0))
    const months = Array.from({ length: 9 }, (_, index) => `${season + (index >= 4 ? 1 : 0)}-${String((index + 8) % 12 + 1).padStart(2, '0')}`)
    const active = payments.filter(p => p.type === 'academy' && p.concept_code === 'monthly' && !['cancelled', 'refunded'].includes(p.status))
    const rows = months.map(month => {
        const receipts = active.filter(p => p.covered_month === month)
        const balances = receipts.map(receiptBalance)
        return {
            month,
            status: monthlyPaymentStatus(payments, month),
            paid: balances.reduce((sum, balance) => sum + Math.round(balance.paid * 100), 0) / 100,
            remaining: balances.reduce((sum, balance) => sum + Math.round(balance.remaining * 100), 0) / 100,
        }
    })
    const owing = rows.filter(row => row.status === 'pending' || row.status === 'partial')
    const missing = rows.filter(row => row.status === 'missing')
    const unassigned = payments.filter(p => p.type === 'academy' && !p.covered_month && !p.concept_code && !['cancelled', 'refunded'].includes(p.status))
        .concat(active.filter(p => !p.covered_month))

    return <section aria-labelledby="monthly-payments-heading" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 id="monthly-payments-heading" className="text-lg font-bold text-navy">Cuotas de Academia · mes a mes</h2>
                <p className="mt-1 text-sm text-slate-600">Temporada {season}–{season + 1} · septiembre a mayo</p>
            </div>
            <div className="flex items-center gap-2">
                <button type="button" aria-label="Temporada anterior" onClick={() => setSeason(year => year - 1)} className="rounded-lg border px-3 py-2 font-bold">←</button>
                <span className="text-sm font-semibold" aria-live="polite">{season}–{season + 1}</span>
                <button type="button" aria-label="Temporada siguiente" onClick={() => setSeason(year => year + 1)} className="rounded-lg border px-3 py-2 font-bold">→</button>
            </div>
        </div>
        {owing.length > 0 && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900"><strong>Falta por pagar: {money(owing.reduce((sum, row) => sum + Math.round(row.remaining * 100), 0) / 100)}.</strong> Meses con saldo pendiente: {owing.map(row => monthName(row.month)).join(', ')}.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rows.map(row => <article key={row.month} aria-label={`${monthName(row.month)} ${row.month.slice(0, 4)}`} className={`rounded-xl border p-3 ${colors[row.status]}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                    <h3 className="font-bold capitalize text-navy">{monthName(row.month)} <span className="text-xs font-normal text-slate-500">{row.month.slice(0, 4)}</span></h3>
                    {row.month === currentMonth && <span className="text-xs font-semibold text-navy">Mes actual</span>}
                </div>
                <MonthlyPaymentDot status={row.status} />
                {row.status === 'missing' ? <p className="mt-2 text-xs text-slate-600">Sin recibo para comprobar el pago.</p> : <div className="mt-2 space-y-1 text-xs text-slate-700">
                    <p>Abonado: <strong>{money(row.paid)}</strong></p>
                    {row.remaining > 0 ? <p className="font-bold text-rose-800">Falta: {money(row.remaining)}</p> : <p>{row.status === 'waived' ? 'Cuota sin importe a cobrar.' : 'Recibos del mes cobrados.'}</p>}
                </div>}
            </article>)}
        </div>
        <p className="text-xs text-slate-600">{missing.length > 0 ? `${missing.length} meses sin cuota creada. ` : ''}«Sin cuota creada» no significa pagado ni deuda confirmada. Solo se asigna un cobro a un mes cuando el recibo lo indica.</p>
        {unassigned.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Hay {unassigned.length} {unassigned.length === 1 ? 'recibo de Academia sin mes asignado' : 'recibos de Academia sin mes asignado'}. Revísalos en el historial: no marcan ningún mes como pagado.</p>}
        <button type="button" onClick={onViewPayments} className="rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white">Ver detalle de recibos y pagos</button>
    </section>
}
