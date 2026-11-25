'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { submitTravelTournament } from '@/app/actions/travel-tournaments'
import { getTournamentPricing } from '@/lib/tournament-pricing'
import type { TravelTournamentOffer } from '@/lib/travel-tournament'
import type { FamilyContext } from '@/lib/family-context'
import { FormDraft, DraftInput, DraftSelect, DraftTextarea, useDraftState, useFormDraft } from '@/components/forms/form-draft'
import { useT } from '@/lib/i18n/client'

export function TravelTournamentForm(props: { offer: TravelTournamentOffer; family: FamilyContext }) {
    return <FormDraft storageKey={`academy:travel:${props.offer.id}:${props.family.userId}`}><Fields {...props} /></FormDraft>
}
function Fields({ offer, family }: { offer: TravelTournamentOffer; family: FamilyContext }) {
    const t = useT(), draft = useFormDraft()
    const [childId, setChildId] = useDraftState<string>('child', '', value => !value || family.children.some(c => c.id === value))
    const [plan, setPlan] = useDraftState<'monthly' | 'two'>('plan', 'monthly', value => ['monthly', 'two'].includes(value))
    const [requestId] = useDraftState('request-id', () => crypto.randomUUID())
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState('')
    const sending = useRef(false)
    const child = family.children.find(c => c.id === childId)
    const pricing = getTournamentPricing(offer.id, offer.price)!
    const amounts = plan === 'two' ? pricing.twoPaymentsCents : pricing.monthlyCents
    const money = (cents: number) => new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }).format(cents / 100)
    const field = 'mt-2 block min-h-12 w-full rounded-lg border border-slate-300 bg-white p-3 text-base'
    if (sent) return <section role="status" className="space-y-4 rounded-2xl border border-green-300 bg-white p-7"><h2 className="text-2xl font-black">{t('Solicitud recibida')}</h2><p>{t('La administradora revisará la plaza y recibirás la respuesta por correo. Todavía no hagas ninguna transferencia.')}</p><p>{t('Referencia')}: {sent.slice(0, 8).toUpperCase()}</p><p>{t('El aviso se enviará a')}: <strong>{family.email}</strong></p><button type="button" onClick={() => draft.reset()} className="block font-bold underline">{t('Inscribir a otro jugador')}</button></section>
    return <form className="space-y-6 rounded-2xl border bg-white p-5 sm:p-8" onSubmit={async event => {
        event.preventDefault(); if (sending.current) return
        sending.current = true; setBusy(true); setError('')
        const form = new FormData(event.currentTarget)
        try {
            const result = await submitTravelTournament({
                request_id: requestId, tournament_id: offer.id, offer_version: offer.version, plan_choice: plan, payment_choice: 'transfer',
                child_id: child?.id || null, child_name: child?.full_name || form.get('child_name'), birth_date: child?.birth_date || form.get('birth_date'),
                guardian_name: form.get('guardian_name'), phone: form.get('phone'), club: form.get('club'), position: form.get('position'),
                image_consent: form.get('image_consent') === 'yes', privacy_consent: form.get('privacy_consent') === 'on',
                terms_consent: form.get('terms_consent') === 'on', participation_consent: form.get('participation_consent') === 'on', notes: form.get('notes') || '', website: form.get('website') || '',
            })
            if (!result.success) setError(t(result.error))
            else { draft.clear(); setSent(result.id) }
        } catch { setError(t('No se pudo enviar. Tus datos se conservan; vuelve a intentarlo.')) }
        finally { sending.current = false; setBusy(false) }
    }}>
        <fieldset disabled={busy} className="space-y-5">
            <legend className="text-xl font-bold">{t('Datos del jugador')}</legend>
            {!!family.children.length && <label className="block text-sm font-semibold">{t('Jugador')}<select value={childId} onChange={e => setChildId(e.target.value)} className={field}><option value="">{t('Añadir otro jugador')}</option>{family.children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></label>}
            {child ? <p className="rounded-xl bg-slate-50 p-4">{child.full_name} · {child.birth_date || t('Completa el nacimiento de la ficha con administración.')}</p> : <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">{t('Nombre completo del jugador')}<DraftInput name="child_name" required minLength={2} maxLength={120} className={field} /></label><label className="text-sm font-semibold">{t('Fecha de nacimiento')}<DraftInput name="birth_date" type="date" required max={new Date().toISOString().slice(0, 10)} className={field} /></label></div>}
            <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">{t('Club actual (o sin equipo)')}<DraftInput name="club" required minLength={2} maxLength={120} className={field} /></label><label className="text-sm font-semibold">{t('Modalidad')}<DraftSelect name="position" required defaultValue="" className={field}><option value="" disabled>{t('Selecciona una opción')}</option><option value="field">{t('Jugador de campo')}</option><option value="keeper">{t('Portero')}</option></DraftSelect></label></div>
            <h2 className="pt-3 text-xl font-bold">{t('Padre, madre o tutor')}</h2>
            <p className="break-words text-sm">{t('Correo verificado')}: <strong>{family.email}</strong></p>
            <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">{t('Nombre completo del tutor')}<DraftInput name="guardian_name" defaultValue={family.guardianName} required minLength={2} maxLength={120} autoComplete="name" className={field} /></label><label className="text-sm font-semibold">{t('Teléfono')}<DraftInput name="phone" type="tel" defaultValue={family.phone} required autoComplete="tel" className={field} /></label></div>
            <fieldset className="rounded-xl border border-gold bg-amber-50 p-4"><legend className="px-2 font-bold">{t('Pago por transferencia')}</legend><label className="flex min-h-11 items-center gap-3"><input type="radio" name="plan" value="monthly" checked={plan === 'monthly'} onChange={() => setPlan('monthly')} />{t('Mensualidades')}</label><label className="flex min-h-11 items-center gap-3"><input type="radio" name="plan" value="two" checked={plan === 'two'} onChange={() => setPlan('two')} />{t('Dos pagos')}</label><p className="mt-3 text-sm" aria-live="polite">{amounts.map(money).join(' + ')}</p><p className="mt-2 font-bold">{t('Precio total')}: {money(amounts.reduce((sum, n) => sum + n, 0))}{pricing.flightExcluded && <> + {t('vuelo')}</>}</p><p className="mt-3 text-sm">{t('Administración confirmará las fechas y los datos bancarios después de aceptar la plaza. No hay cargos automáticos.')}</p></fieldset>
            <label className="block text-sm font-semibold">{t('Observaciones')}<DraftTextarea name="notes" maxLength={1000} rows={3} className={field} /></label>
            <label className="block text-sm font-semibold">{t('¿Autorizas el uso de imágenes del jugador de este torneo por Academy?')}<DraftSelect name="image_consent" required defaultValue="" className={field}><option value="" disabled>{t('Selecciona una opción')}</option><option value="yes">{t('Sí, autorizo')}</option><option value="no">{t('No autorizo')}</option></DraftSelect></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="privacy_consent" required className="mt-1 h-5 w-5 shrink-0" /><span>{t('He leído y acepto la')} <Link className="underline" href="/privacidad" target="_blank">{t('política de privacidad')}</Link>.</span></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="terms_consent" required className="mt-1 h-5 w-5 shrink-0" /><span>{t('He leído y acepto las')} <Link className="underline" href="/terminos" target="_blank">{t('condiciones de participación')}</Link>.</span></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="participation_consent" required className="mt-1 h-5 w-5 shrink-0" /><span>{t('Soy el padre, madre o tutor y solicito la participación del jugador. Entiendo que la plaza está pendiente de aceptación y que pagaré por transferencia según la modalidad elegida.')}</span></label>
            <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
            <button disabled={busy || !!child && !child.birth_date} className="min-h-12 w-full rounded-xl bg-gold px-4 py-3 font-bold text-navy disabled:opacity-50">{t(busy ? 'Enviando…' : 'Enviar solicitud de plaza')}</button>
        </fieldset>
    </form>
}
