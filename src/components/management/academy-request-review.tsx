'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Check, RefreshCw, ChevronLeft, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { convertEnrollmentRequest } from '@/app/actions/enrollment'
import { refreshAcademyRequestReview } from '@/app/actions/academy-request-review'
import { retainedAcademyReviewInput, reviewedAcademyQuote, type AcademyRequestReviewContext } from '@/lib/academy-request-review'
import { pastIncorporation, historyReviewMessage } from '@/lib/enrollment-history'
import { academyCashInstructions } from '@/lib/academy-cash-instructions'

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
const dateLabel = (date: string) => new Date(date + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function AcademyRequestReview({ context: initialContext }: { context: AcademyRequestReviewContext }) {
  const [context, setContext] = useState(initialContext)
  const [reviewMessage, setReviewMessage] = useState('')
  const [closed, setClosed] = useState(false)
  const inFlight = useRef(false)
  const r = context.request, d = r.academy_details
  const [startDate, setStartDate] = useState(d.start_date)
  const [chargeEnrollment, setChargeEnrollment] = useState(!context.fee_exempt && d.plan.enrollment_fee > 0 && (d.admin_completion?.charge_enrollment ?? true))
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [accepted, setAccepted] = useState(false), [notice, setNotice] = useState('')
  let quote: ReturnType<typeof reviewedAcademyQuote> | null = null
  try { quote = reviewedAcademyQuote(context, startDate, chargeEnrollment) } catch { /* Invalid or incomplete date: keep acceptance disabled. */ }
  const historical = pastIncorporation(startDate)
  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7'

  async function updateReview() {
    const result = await refreshAcademyRequestReview(r.id)
    if (!result.success) {
      setError(result.error)
      if ('closed' in result && result.closed) setClosed(true)
      return
    }
    const retained = retainedAcademyReviewInput(result.context, startDate, chargeEnrollment)
    setContext(result.context)
    setStartDate(retained.startDate)
    setChargeEnrollment(retained.chargeEnrollment)
    setError('')
    setReviewMessage('Revisión actualizada. Hemos conservado tus cambios compatibles con la ficha actual. Comprueba el resumen y pulsa «Aceptar plaza y enviar bienvenida» para confirmar. Todavía no se ha enviado ningún correo.')
  }

  async function refreshReview() {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(''); setReviewMessage('')
    try { await updateReview() }
    catch { setError('No se pudo actualizar la revisión. Conservamos tus cambios; vuelve a intentarlo.') }
    finally { inFlight.current = false; setBusy(false) }
  }

  async function accept() {
    if (inFlight.current || closed || !quote) return
    inFlight.current = true
    setBusy(true); setError(''); setReviewMessage('')
    try {
      const result = await convertEnrollmentRequest(r.id, { startDate, chargeEnrollment, revision: context.revision })
      if (!result.success) {
        if ('reviewStale' in result && result.reviewStale) await updateReview()
        else setError(result.error || 'No se pudo aceptar la plaza.')
        return
      }
      setAccepted(true); setNotice(result.notice || 'Plaza aceptada. Revisa el envío en Estado de correos.')
    } catch { setError('No se ha podido confirmar el resultado. Recarga la solicitud para comprobar su estado antes de reintentar.') }
    finally { inFlight.current = false; setBusy(false) }
  }

  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <Link href="/admin/solicitudes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ChevronLeft size={16} /> Solicitudes</Link>
    <header className="rounded-2xl bg-navy p-6 text-white sm:p-8">
      <span className="text-xs font-bold uppercase tracking-widest text-gold">Academia · Revisión de plaza</span>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{r.child_name}</h1>
      <p className="mt-2 text-sm text-slate-200">Revisa la incorporación y la matrícula antes de enviar la bienvenida.</p>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="flex items-center gap-2"><UserRound size={16} /> {r.guardian_name}</span><span className="break-all">{r.email}</span><span>{r.phone}</span></div>
    </header>

    {accepted ? <section className={card} role="status">
      <Check className="mb-3 h-10 w-10 rounded-full bg-emerald-100 p-2 text-emerald-700" />
      <h2 className="text-xl font-bold text-navy">Plaza aceptada con los importes revisados</h2>
      <p className="mt-3 text-sm text-slate-600">{notice}</p>
      <p className="mt-2 text-sm text-slate-600">La bienvenida utiliza esta fecha y este desglose. Puedes comprobar su envío en Estado de correos.</p>
      {d.family_batch_id && <Link href={`/admin/solicitudes/familia/${d.family_batch_id}`} className="mt-4 block font-bold text-navy underline">Ver estado y enlace del pago familiar</Link>}
      <Link href="/admin/solicitudes" className="mt-5 inline-flex rounded-xl bg-navy px-5 py-3 font-bold text-white">Volver a solicitudes</Link>
    </section> : <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <section className={`${card} border-emerald-200`}>
          <h2 className="flex items-center gap-2 font-bold text-navy"><ShieldCheck size={18} /> Comprobación de fichas</h2>
          <p className="mt-3 text-sm text-slate-600">{context.child_id
            ? 'Este jugador ya existe. Se reutilizarán su ficha y su vínculo familiar, conservando su historial.'
            : context.identity?.guardian_id
              ? 'El tutor ya existe. Se conservará su cuenta y se añadirá únicamente la ficha del nuevo jugador.'
              : 'No hay una ficha coincidente. Se crearán las fichas de esta familia al aceptar.'}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-navy">
            {context.child_id && <Link className="underline" href={`/admin/crm/alumnos/${context.child_id}`}>Ver ficha del jugador</Link>}
            {context.identity?.guardian_id && <Link className="underline" href="/admin/crm/tutores">Revisar tutor existente</Link>}
          </div>
          <p className="mt-3 text-xs text-slate-500">Los datos se vuelven a comprobar al aceptar. Una coincidencia dudosa bloquea el alta para revisarla antes de crear otra ficha.</p>
        </section>
        <section className={card}>
          <h2 className="font-bold text-navy">La plaza solicitada</h2>
          {d.family_batch_id && <Link href={`/admin/solicitudes/familia/${d.family_batch_id}`} className="mt-3 block rounded-xl bg-amber-50 p-3 text-sm font-semibold text-navy underline">Pago familiar conjunto · Revisar las plazas de los hermanos. El enlace reúne los importes cuando estén todas resueltas.</Link>}
          {d.admin_completion && <Link href={`/admin/solicitudes/academia/${r.id}/completar`} className="mt-2 inline-flex text-sm font-semibold text-navy underline">Cambiar plan, grupos o pago</Link>}
          <p className="mt-3 text-sm font-semibold">{d.plan.name}</p>
          {d.groups.map(g => <p key={g.id} className="mt-2 text-sm text-slate-600">{g.name} · {g.public_offer.day} · {g.schedule}</p>)}
          <p className="mt-3 text-sm text-slate-600">Pago: <strong>{d.payment_choice === 'monthly_card' ? 'Tarjeta · Stripe' : d.payment_choice === 'cash' ? 'Efectivo' : d.payment_choice}</strong></p>
          <p className="mt-2 text-sm text-slate-600">Plus anual: <strong>{d.quote.plus === 50 ? 'Solicitado · 50 € · pago único' : 'No solicitado'}</strong></p>
          {r.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{r.notes}</p>}
        </section>
        <fieldset disabled={busy} className={`${card} space-y-6 disabled:opacity-70`}>
          <div>
            <label htmlFor="review-start-date" className="flex items-center gap-2 font-bold text-navy"><CalendarDays size={18} /> Día de incorporación</label>
            <p className="mt-2 text-sm text-slate-500">Es el día que empieza a entrenar. De él depende la primera cuota.</p>
            <input id="review-start-date" type="date" required min={d.plan.season_start} max={d.plan.season_end} value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-navy focus:outline-gold" />
            <p className="mt-2 text-xs text-slate-500">Fecha solicitada: {dateLabel(d.start_date)}</p>
            {!quote && <p className="mt-2 text-sm text-red-700">Elige una fecha entre {dateLabel(d.plan.season_start)} y {dateLabel(d.plan.season_end)}.</p>}
          </div>
          <div className="border-t pt-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={chargeEnrollment} disabled={context.fee_exempt || d.plan.enrollment_fee === 0} onChange={e => setChargeEnrollment(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#c9a830]" />
              <span><strong className="block text-navy">Cobrar matrícula · {euros(d.plan.enrollment_fee)}</strong><span className="mt-1 block text-sm text-slate-500">Desmarca esta casilla si ya es jugador de la Academy y no le corresponde matrícula.</span></span>
            </label>
            {!chargeEnrollment && <p className="mt-3 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><ShieldCheck size={18} className="shrink-0" />{context.fee_exempt ? 'Sin matrícula: ya consta historial de Academia o una matrícula registrada.' : 'Sin matrícula. Se enviará la cuota de incorporación y los extras que correspondan.'}</p>}
            {context.plus_recorded && d.quote.plus > 0 && <p className="mt-3 text-sm text-slate-500">El Plus ya consta registrado; no se añade de nuevo.</p>}
          </div>
        </fieldset>
      </div>
      <section className={`${card} lg:sticky lg:top-6`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Mail size={16} /> Así lo recibirá la familia</div>
        <h2 className="mt-4 text-xl font-bold text-navy">Tu plaza en la Academy está confirmada</h2>
        <p className="mt-2 text-sm text-slate-500">Resumen del correo de bienvenida que se enviará al aceptar.</p>
        {quote && <>
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-navy">Incorporación: <strong>{dateLabel(startDate)}</strong></p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt>Primera cuota <span className="ml-1 rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-900">{quote.percent} %</span></dt><dd className="font-semibold">{euros(quote.first_month)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Matrícula{quote.enrollment_fee === 0 ? ' · exenta' : ''}</dt><dd className="font-semibold">{euros(quote.enrollment_fee)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Plus anual{quote.plus > 0 ? ' · pago único' : context.plus_recorded && d.quote.plus === 50 ? ' · ya registrado' : ' · no solicitado'}</dt><dd className="font-semibold">{euros(quote.plus)}</dd></div>
            <div className="flex items-center justify-between gap-3 border-t pt-4 text-navy"><dt className="font-bold">{historical ? 'Importe inicial a revisar' : 'Primer pago'}</dt><dd className="text-3xl font-bold">{euros(quote.first_total)}</dd></div>
          </dl>
          {!historical && d.payment_choice === 'monthly_card' && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-950"><strong>Se cobra al completar Stripe.</strong> Este primer pago cubre el mes de incorporación, aunque la familia lo pague antes de empezar. Ese mes no se cobrará de nuevo.</p>}
          {!historical && d.payment_choice === 'cash' && <p className="mt-4 whitespace-pre-line rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">{academyCashInstructions(quote.first_total, startDate)}</p>}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{quote.remaining.length ? `Después: ${euros(quote.monthly_price)}/mes desde ${dateLabel(quote.remaining[0].due_date)} hasta el final de temporada (${dateLabel(quote.season_end)}).` : 'Último mes de la temporada: sin mensualidades posteriores.'}</p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Prorrateo: días 1–7: 100 % · 8–15: 75 % · 16–22: 50 % · 23–fin: 25 %.</p>
        </>}
        {historical && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><strong>Revisión de pagos anteriores obligatoria</strong><p className="mt-2">{historyReviewMessage}</p><p className="mt-2">Después de aceptar, abre la ficha del jugador, registra los cobros anteriores y confirma la revisión en «Actividad y forma de pago». Aceptar no marca ningún recibo como pagado.</p></div>}
        {reviewMessage && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">{reviewMessage}</p>}
        {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"><p role="alert">{error}</p>{!closed && <button type="button" disabled={busy} onClick={refreshReview} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 font-semibold disabled:opacity-50"><RefreshCw size={16} />Actualizar revisión sin perder cambios</button>}</div>}
        <button type="button" disabled={busy || closed || !quote} onClick={accept} className="mt-6 min-h-12 w-full rounded-xl bg-gold px-4 py-3 font-bold text-navy transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Aceptando plaza…' : 'Aceptar plaza y enviar bienvenida'}</button>
        <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">Se vincula el jugador y se crean sus recibos pendientes. La familia recibe la confirmación; si la incorporación es anterior, se informa de la revisión de pagos pendiente.</p>
      </section>
    </div>}
  </div>
}
