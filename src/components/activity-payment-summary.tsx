import { paymentChoicesText, requestedPaymentChoices, type PaymentRequest } from '@/lib/enrollment-payment'
export function ActivityPaymentSummary({ request }: { request: PaymentRequest }) {
    const text = paymentChoicesText(requestedPaymentChoices(request))
    if (!text) return null
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><p className="font-bold text-navy">Formas de pago solicitadas</p><p className="mt-2 whitespace-pre-line">{text}</p><p className="mt-2 text-xs text-slate-500">Esta elección no acredita ningún cobro.</p>{request.service === 'academy' && (requestedPaymentChoices(request).campus || requestedPaymentChoices(request).tournament) && <p className="mt-2 text-xs text-amber-800">Campus y Torneos se concretan por separado. Aceptar Academia no confirma esas plazas.</p>}</div>
}
