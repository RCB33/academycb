'use client'

import { useT } from '@/lib/i18n/client'
import { academyPaymentMessage, combinedEnrollmentMessage } from '@/lib/enrollment-payment'

export function EnrollmentPaymentChoice({ prefix, combined = false, recurringAvailable = false }: { prefix: string; combined?: boolean; recurringAvailable?: boolean }) {
    const translate = useT()
    return <div className="space-y-3">
        <label className="block text-sm font-bold" htmlFor={`${prefix}payment_choice${combined ? '_combined' : ''}`}>
            {translate('Forma de pago solicitada')}
            <select id={`${prefix}payment_choice${combined ? '_combined' : ''}`} required name={`${prefix}payment_choice`} key={combined ? 'combined' : 'academy'} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" defaultValue="cash">
                <option value="cash">{translate('Efectivo')}</option>
                <option value="monthly_card">{translate('Tarjeta con Stripe')}</option>
                {combined && <option value="transfer">{translate('Transferencia bancaria')}</option>}
            </select>
        </label>
        <p className="text-sm font-semibold leading-relaxed text-navy">{translate(combined ? combinedEnrollmentMessage : academyPaymentMessage)}</p>
        {!combined && !recurringAvailable && <p className="text-xs leading-relaxed text-slate-600">{translate('Puedes solicitar tarjeta con Stripe. Te avisaremos cuando esté disponible el enlace para autorizar las mensualidades. No se cobra al enviar la solicitud.')}</p>}
    </div>
}
