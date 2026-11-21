'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { completeAcademyRequest } from '@/app/actions/academy-request-completion'
import { completeAcademyDetails, groupFitsBirthYear, type AcademyCompletionContext, type AcademyCompletionInput } from '@/lib/academy-request-completion'
import type { AcademyOffer } from '@/lib/offering'

const money = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
const field = 'mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-navy focus:outline-gold'
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7'

export function AcademyRequestCompletion({ context, offer }: { context: AcademyCompletionContext; offer: AcademyOffer }) {
  const r = context.request, saved = r.academy_details, router = useRouter()
  const [planId, setPlanId] = useState(saved?.plan.id || ''), [groupId, setGroupId] = useState(saved?.groups[0]?.id || '')
  const [secondGroupId, setSecondGroupId] = useState(saved?.groups[1]?.id || ''), [startDate, setStartDate] = useState(saved?.start_date || '')
  const [chargeEnrollment, setChargeEnrollment] = useState(saved?.admin_completion?.charge_enrollment ?? true), [plus, setPlus] = useState(saved?.quote.plus === 50)
  const [paymentChoice, setPaymentChoice] = useState(saved?.payment_choice || ''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const plan = offer.plans.find(p => p.id === planId)
  const groups = offer.groups.filter(g => groupFitsBirthYear(r.birth_date, g.public_offer.birth_from, g.public_offer.birth_to))
  const firstGroups = groups.filter(g => plan?.sessions_per_week !== 2 || g.public_offer.kind !== 'sunday')
  const sundayGroups = groups.filter(g => g.public_offer.kind === 'sunday')
  const input = { planId, groupId, secondGroupId, startDate, chargeEnrollment, plus, paymentChoice, revision: context.revision, offerVersion: offer.version }
  let details: ReturnType<typeof completeAcademyDetails> | null = null
  try { if (paymentChoice) details = completeAcademyDetails(offer, input as AcademyCompletionInput, r.birth_date) } catch { /* Show a total only after the selection is valid. */ }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return
    setBusy(true); setError('')
    try {
      const result = await completeAcademyRequest(r.id, input)
      if (result.error) { setError(result.error); setBusy(false); return }
      router.push(`/admin/solicitudes/academia/${r.id}`); router.refresh()
    } catch { setError('No se pudo confirmar el guardado. Recarga la solicitud para comprobar su estado.'); setBusy(false) }
  }

  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <Link href="/admin/solicitudes" className="text-sm font-semibold text-slate-600">← Solicitudes</Link>
    <header className="rounded-2xl bg-navy p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">Academia · Completar plan</p>
      <h1 className="mt-3 text-2xl font-bold">{r.child_name}</h1>
      <p className="mt-2 text-sm text-slate-200">La familia ya ha enviado sus datos. Completa aquí las condiciones acordadas.</p>
      <p className="mt-4 break-words text-sm">Tutor: {r.guardian_name} · {r.email} · Nacimiento: {r.birth_date.split('-').reverse().join('/')}</p>
      {r.notes && <p className="mt-4 whitespace-pre-line text-sm text-slate-200">{r.notes}</p>}
    </header>
    <form onSubmit={save} className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
      <fieldset disabled={busy} className={`${panel} space-y-5 disabled:opacity-70`}>
        <div><label htmlFor="completion-plan" className="font-bold text-navy">Plan de Academia</label>
          <select id="completion-plan" required className={field} value={planId} onChange={e => { setPlanId(e.target.value); setGroupId(''); setSecondGroupId('') }}>
            <option value="">Selecciona el plan</option>{offer.plans.map(p => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}/mes</option>)}
          </select>
        </div>
        <div><label htmlFor="completion-group" className="font-bold text-navy">{plan?.sessions_per_week === 2 ? 'Grupo entre semana' : 'Grupo y horario'}</label>
          <select id="completion-group" required disabled={!plan} className={field} value={groupId} onChange={e => setGroupId(e.target.value)}>
            <option value="">Selecciona el grupo</option>{firstGroups.map(g => <option key={g.id} value={g.id}>{g.name} · {g.public_offer.day} · {g.schedule} · {g.public_offer.location}</option>)}
          </select>
        </div>
        {plan?.sessions_per_week === 2 && <div><label htmlFor="completion-sunday" className="font-bold text-navy">Grupo del domingo</label>
          <select id="completion-sunday" required className={field} value={secondGroupId} onChange={e => setSecondGroupId(e.target.value)}>
            <option value="">Selecciona el grupo del domingo</option>{sundayGroups.map(g => <option key={g.id} value={g.id}>{g.name} · {g.schedule} · {g.public_offer.location}</option>)}
          </select>
        </div>}
        <div><label htmlFor="completion-start" className="font-bold text-navy">Día de incorporación</label>
          <input id="completion-start" required type="date" min={plan?.season_start} max={plan?.season_end} className={field} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <p className="mt-2 text-xs text-slate-500">La primera cuota se calcula con esta fecha, no con la fecha de la solicitud.</p>
        </div>
        <div><label htmlFor="completion-payment" className="font-bold text-navy">Cómo paga</label>
          <select id="completion-payment" required className={field} value={paymentChoice} onChange={e => setPaymentChoice(e.target.value)}>
            <option value="">Selecciona la forma de pago</option><option value="cash">Efectivo · validación de Karen</option><option value="monthly_card">Tarjeta · Stripe</option>
          </select>
          {paymentChoice === 'monthly_card' && offer.recurring_available === false && <p className="mt-2 text-sm text-amber-800">La activación de tarjeta no está disponible ahora. Se guardará la preferencia para revisarla antes de enviar el enlace.</p>}
        </div>
        <label className="flex cursor-pointer items-start gap-3 border-t pt-5"><input type="checkbox" checked={chargeEnrollment} onChange={e => setChargeEnrollment(e.target.checked)} className="mt-1 h-5 w-5 accent-[#c9a830]" /><span><strong className="block text-navy">Cobrar matrícula{plan ? ` · ${money(plan.enrollment_fee)}` : ''}</strong><span className="text-sm text-slate-500">Desmárcala si ya pertenece a la Academy.</span></span></label>
        <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={plus} onChange={e => setPlus(e.target.checked)} className="mt-1 h-5 w-5 accent-[#c9a830]" /><span><strong className="block text-navy">Plus anual · 50 €</strong><span className="text-sm text-slate-500">Solo si lo ha elegido la familia. Pago único.</span></span></label>
      </fieldset>
      <section className={`${panel} lg:sticky lg:top-6`}>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Antes de aceptar</p>
        <h2 className="mt-3 text-xl font-bold text-navy">Resumen de las condiciones</h2>
        {details ? <>
          <p className="mt-4 text-sm text-slate-600">{details.plan.name}</p>
          {details.groups.map(g => <p key={g.id} className="mt-2 text-sm text-slate-600">{g.name} · {g.public_offer.day} · {g.schedule}</p>)}
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt>Primera cuota · {details.quote.percent} %</dt><dd>{money(details.quote.first_month)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Matrícula</dt><dd>{money(details.quote.enrollment_fee)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Plus anual · {plus ? 'pago único' : 'no elegido'}</dt><dd>{money(details.quote.plus)}</dd></div>
            <div className="flex justify-between gap-3 border-t pt-4 font-bold text-navy"><dt>Primer pago previsto</dt><dd className="text-2xl">{money(details.quote.first_total)}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{details.quote.remaining.length ? `Después: ${details.quote.remaining.length} mensualidades de ${money(details.quote.monthly_price)}, hasta ${details.plan.season_end.split('-').reverse().join('/')}.` : 'Sin mensualidades posteriores.'} Si ya consta matrícula o Plus, se comprobará en la revisión para no duplicarlos.</p>
        </> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Elige plan, grupos, fecha y pago para ver el importe.</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy || !details} type="submit" className="mt-6 min-h-12 w-full rounded-xl bg-gold px-4 py-3 font-bold text-navy disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar plan y revisar plaza'}</button>
        <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">En el siguiente paso podrás aceptar y enviar la bienvenida. Guardar aquí no cobra ni envía correos.</p>
      </section>
    </form>
  </div>
}
