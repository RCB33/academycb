'use client'
import { useDraftState } from '@/components/forms/form-draft'
import { useT } from '@/lib/i18n/client'
import { allowedEnrollmentPayments, enrollmentPaymentLabel, isAllowedEnrollmentPayment, paymentMessages, paymentServiceLabels, type PaymentService } from '@/lib/enrollment-payment'

export function EnrollmentPaymentChoice({ prefix, service = 'academy', recurringAvailable = false }: { prefix: string; service?: PaymentService; recurringAvailable?: boolean }) {
    const translate = useT()
    const [choice, setChoice] = useDraftState<string>(`${prefix}${service}:payment:v2`, service === 'tournament' ? 'transfer' : '', value => value === '' || isAllowedEnrollmentPayment(service, value))
    return <div className="space-y-3">
        <label className="block text-sm font-bold" htmlFor={`${prefix}payment_choice`}>
            {translate(`Forma de pago · ${paymentServiceLabels[service]}`)}
            <select id={`${prefix}payment_choice`} required name={`${prefix}payment_choice`} value={choice} onChange={event => setChoice(event.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {service !== 'tournament' && <option value="">{translate('Elige la forma de pago')}</option>}
                {allowedEnrollmentPayments[service].map(method => <option key={method} value={method}>{translate(enrollmentPaymentLabel(method))}</option>)}
            </select>
        </label>
        <p className="text-sm font-semibold leading-relaxed text-navy">{translate(paymentMessages[service])}</p>
        {service === 'academy' && !recurringAvailable && <p className="text-xs leading-relaxed text-slate-600">{translate('Puedes solicitar tarjeta con Stripe. Te avisaremos cuando esté disponible el enlace para autorizar las mensualidades. No se cobra al enviar la solicitud.')}</p>}
    </div>
}
