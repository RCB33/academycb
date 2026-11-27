'use client'
import { useState } from 'react'
import Link from 'next/link'
import { completePaymentHistoryReview } from '@/app/actions/payment-history-review'
import { historyReviewPending, type PaymentHistoryReview } from '@/lib/enrollment-history'

export function PaymentHistoryReviewPanel({ membership, childId, onSaved }: { membership: PaymentHistoryReview & { id: string }; childId: string; onSaved: () => void }) {
  const [note, setNote] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  if (!membership.history_review_required) return null
  if (!historyReviewPending(membership)) return <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm"><strong>Pagos anteriores revisados</strong><p>{membership.history_review_note}</p><p className="mt-2">La revisión no cobra ni liquida recibos. Envía un enlace solo por las cuotas que sigan pendientes.</p></div>
  async function save() {
    if (busy || !confirmed) return
    setBusy(true); setError('')
    try {
      const result = await completePaymentHistoryReview({ membershipId: membership.id, note })
      if (result.error) setError(result.error); else onSaved()
    } catch { setError('No se pudo guardar la revisión. Inténtalo de nuevo.') } finally { setBusy(false) }
  }
  return <div className="mt-4 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
    <h5 className="font-bold">Revisar pagos anteriores</h5>
    <p>Esta incorporación es anterior al alta en la web. Comprueba cada mes desde el inicio, la matrícula y el Plus. Registra los importes ya cobrados con su fecha y método reales; deja pendientes solo los saldos por cobrar.</p>
    <Link className="block font-bold underline" href={`/admin/finanzas?child_id=${childId}`}>Abrir recibos y registrar cobros anteriores</Link>
    <p>La tarjeta está bloqueada hasta confirmar esta revisión. Confirmar no marca recibos como pagados ni envía enlaces. Después, prepara en Finanzas un enlace con los recibos pendientes; las mensualidades automáticas deben tener vencimientos futuros.</p>
    <label className="block font-semibold">Resultado de la revisión<textarea disabled={busy} value={note} onChange={e=>setNote(e.target.value)} minLength={5} maxLength={2000} className="mt-2 min-h-24 w-full rounded-lg border bg-white p-2" placeholder="Meses comprobados, pagos registrados y saldo pendiente." /></label>
    <label className="flex items-start gap-2"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1" /><span>He comprobado los pagos anteriores y registrado los cobros recibidos. Los saldos pendientes son correctos.</span></label>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <button disabled={busy||!confirmed||note.trim().length<5} onClick={()=>void save()} className="min-h-11 rounded-lg bg-navy px-4 py-2 font-bold text-white disabled:opacity-50">{busy?'Guardando…':'Confirmar revisión de pagos anteriores'}</button>
  </div>
}
