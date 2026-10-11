'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Euro, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getBillingSuffix, normalizeBillingFrequency } from "@/lib/membership-billing"
import { receiptBalance } from '@/lib/receipt-balance'
import { CollectReceiptDialog } from '@/components/admin/collect-receipt-dialog'
import { PaymentReminderButton } from '@/components/admin/payment-reminder-button'
import { CreateChargeDialog } from '@/components/admin/create-charge-dialog'
import { paymentMethodLabel, PAYMENT_CONCEPTS } from '@/lib/payment-concepts'
import { PlayerPaymentSummary } from '@/components/admin/player-payment-summary'
import { ReceiptCollectionHistory } from '@/components/admin/receipt-collection-history'
import { SharePaymentReceipt } from '@/components/admin/share-payment-receipt'

type PaymentsData = {
    memberships: any[]
    payments: any[]
}

export function PaymentsList({ paymentsData, plans, childId, onRefresh }: {
    paymentsData: PaymentsData, plans: any[], childId: string, onRefresh: () => void
}) {
    const { memberships, payments } = paymentsData

    // Stats
    const totalPaid = payments.reduce((sum, p) => sum + receiptBalance(p).paid, 0)
    const totalPending = payments.reduce((sum, p) => sum + receiptBalance(p).remaining, 0)
    const paidCount = payments.filter(p => p.status === 'paid').length
    const pendingCount = payments.filter(p => ['pending', 'failed'].includes(p.status)).length

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Pagos del jugador</h3><p className="text-sm text-slate-500">Registra uno o varios meses sobre sus recibos, sin duplicar ingresos.</p></div><CreateChargeDialog childId={childId} onSaved={onRefresh}/><CollectReceiptDialog childId={childId} onSaved={async () => { await onRefresh() }} /></div>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Pagado</p>
                    <p className="text-xl font-black text-green-700">{totalPaid}€</p>
                    <p className="text-[10px] text-green-500">{paidCount} recibos</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Pendiente</p>
                    <p className="text-xl font-black text-amber-700">{totalPending}€</p>
                    <p className="text-[10px] text-amber-500">{pendingCount} recibos</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Membresías</p>
                    <p className="text-xl font-black text-blue-700">{memberships.length}</p>
                    <p className="text-[10px] text-blue-500">{memberships.filter(m => m.status === 'active').length} activas</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-center">
                    <Link href="/admin/finanzas">
                        <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md">
                            Gestionar en Finanzas <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            <PlayerPaymentSummary payments={payments} />
            {/* Memberships */}
            {memberships.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <CreditCard className="h-3 w-3" /> Suscripciones
                    </h4>
                    {memberships.map((m: any) => {
                        const frequency = normalizeBillingFrequency(m.plan?.frequency, m.plan?.duration_months, m.plan?.name)
                        return (
                            <div key={m.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${m.status === 'active' ? 'bg-green-50' : 'bg-slate-50'}`}>
                                        <Euro className={`h-5 w-5 ${m.status === 'active' ? 'text-green-600' : 'text-slate-400'}`} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">{m.plan?.name || 'Plan personalizado'}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <span>{new Date(m.start_date).toLocaleDateString()} → {new Date(m.end_date).toLocaleDateString()}</span>
                                            {m.payment_method && <span>• {m.payment_method === 'efectivo' ? '💵' : m.payment_method === 'transferencia' ? '🏦' : '💳'} {m.payment_method}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-yellow-600">{m.monthly_price || m.plan?.price || 0}€</span>
                                    <span className="text-[10px] text-slate-400">/{getBillingSuffix(frequency)}</span>
                                    <Badge className={`text-xs ${m.payment_status === 'paid'
                                        ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} border-none`}>
                                        {m.payment_status === 'paid' ? '✓ Pagado' : '⏳ Pendiente'}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Individual Payment Records (read-only) */}
            {payments.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Historial de Recibos ({payments.length})
                    </h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {payments.map((p: any) => (
                            <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${p.status === 'paid'
                                ? 'bg-green-50/30 border-green-100' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    {p.status === 'paid' ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-amber-500" />
                                    )}
                                    <div>
                                        <p className="font-bold text-xs text-slate-900">{p.description || `Pago ${p.type}`}</p>
                                        <Badge variant="outline">{p.status==='paid' && Number(p.amount)===0 && Number(p.discount_amount)>0 ? 'Bonificado' : receiptBalance(p).partial ? 'Pagado parcialmente' : ({ paid: 'Pagado', pending: 'Pendiente', failed: 'Fallido', cancelled: 'Anulado', refunded: 'Reembolsado' }[p.status as string] || p.status)}</Badge>
                                        {p.concept_code && <p className="text-xs font-semibold">{PAYMENT_CONCEPTS[p.concept_code as keyof typeof PAYMENT_CONCEPTS]}{p.covered_month && ` · Mes cubierto: ${p.covered_month}`}</p>}
                                        {p.promotion_label && <p className="text-xs">Promoción: {p.promotion_label} · Descuento: {Number(p.discount_amount).toFixed(2)} €</p>}
                                        <p className="text-xs">Vencimiento: {p.due_date ? new Date(`${p.due_date}T12:00:00`).toLocaleDateString('es-ES') : 'Sin fecha'}</p>
                                        <p className="text-xs">Abonado: {receiptBalance(p).paid.toFixed(2)} € · Pendiente: {receiptBalance(p).remaining.toFixed(2)} €</p>
                                        {['pending', 'failed'].includes(p.status) && receiptBalance(p).remaining > 0 && <PaymentReminderButton id={p.id} />}
                                        <Button asChild size="sm" variant="outline"><a href={`/api/payments/${p.id}/receipt`} target="_blank" rel="noopener noreferrer">Descargar comprobante</a></Button>
                                        <SharePaymentReceipt id={p.id}/>
                                        {p.manual_receipt_allocations?.length>0 && <ReceiptCollectionHistory paymentId={p.id} onSaved={async()=>{await onRefresh()}}/>}
                                        <p className="text-[10px] text-slate-400">
                                            {paymentMethodLabel(p.method)}
                                            {p.paid_at && ` • Cobrado ${new Date(p.paid_at).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </div>
                                <span className={`font-black text-sm ${p.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {p.amount}€
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {memberships.length === 0 && payments.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Euro className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                    <p className="font-bold text-sm">No hay pagos registrados</p>
                    <p className="text-xs mt-1">Inscribe al alumno en Academia para generar la suscripción</p>
                    <p className="text-xs">o registra un pago manual desde <Link href="/admin/finanzas" className="text-yellow-600 font-bold hover:underline">Finanzas</Link></p>
                </div>
            )}
        </div>
    )
}
