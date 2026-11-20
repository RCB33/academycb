import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Check, CreditCard, Clock3, CircleAlert, ArrowRight, ShieldCheck } from 'lucide-react'
import { checkoutResult } from '@/lib/checkout-result'
import { ResultRefresh } from './result-refresh'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Estado de tu pago · Academy Costa Brava', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function PaymentResult({ searchParams }: { searchParams: Promise<{ session_id?: string; cancelled?: string }> }) {
    const params = await searchParams
    let result = null
    let unavailable = false
    try { if (typeof params.session_id === 'string') result = await checkoutResult(params.session_id) } catch { unavailable = true }
    const state = result?.state
    const paid = state === 'paid'
    const authorized = state === 'authorized'
    const polling = authorized || state === 'processing' || unavailable
    const copy = paid
        ? ['Pago realizado correctamente', 'Stripe ha confirmado tu pago. Ya puedes cerrar esta página con tranquilidad.']
        : authorized
        ? ['Tarjeta autorizada correctamente', 'Tu autorización se ha completado. El cargo todavía está pendiente de confirmación; no necesitas introducir la tarjeta otra vez.']
        : state === 'processing'
        ? ['Estamos confirmando la operación', 'Stripe está procesando el resultado. Esta página comprobará el estado automáticamente.']
        : state === 'attention'
        ? ['El pago necesita una revisión', 'La tarjeta está autorizada, pero el cargo no se ha completado. Contacta con Academy para revisar el siguiente paso.']
        : state === 'ended'
        ? ['La suscripción ha finalizado', 'Esta suscripción ya no está activa. Puedes consultar su historial desde tu cuenta.']
        : state === 'expired'
        ? ['Este enlace ha caducado', 'No podemos completar una nueva autorización con este enlace. Contacta con Academy si necesitas continuar.']
        : state === 'incomplete' || (params.cancelled === '1' && !params.session_id)
        ? ['No has completado la operación', 'Salir de Stripe no confirma ningún pago. Si ya autorizaste otra operación, revisa su estado antes de volver a intentarlo.']
        : ['No podemos confirmar el resultado todavía', unavailable ? 'No hemos podido consultar Stripe ahora mismo. No repitas el pago: actualiza el estado o contacta con Academy.' : 'Abre el enlace de resultado de tu operación o entra en tu cuenta para consultar tus pagos.']
    const Icon = paid ? Check : authorized ? CreditCard : polling ? Clock3 : CircleAlert
    const date = (seconds: number) => new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(seconds * 1000))
    const money = result?.amountCents !== undefined ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(result.amountCents / 100) : null
    return <main className="min-h-dvh bg-[#0e2542] px-5 py-10 text-white sm:py-16">
        <div className="mx-auto max-w-lg">
            <Link href="/" className="mb-9 flex items-center justify-center gap-3"><Image src="/email-logo.png" alt="Academy Costa Brava" width={60} height={60} /><span className="text-sm font-semibold tracking-widest text-[#d4af37]">ACADEMY COSTA BRAVA</span></Link>
            <section className="overflow-hidden rounded-3xl bg-white text-[#10294a] shadow-2xl" aria-labelledby="result-title">
                <div className="h-1.5 bg-[#d4af37]" />
                <div className="p-7 sm:p-9">
                    {result?.test && <p className="mb-4 text-xs font-bold uppercase text-amber-800">Entorno de prueba · sin dinero real</p>}
                    <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-[#faf3d8] text-[#8c6b10]'}`}><Icon className="h-8 w-8" aria-hidden="true" /></div>
                    <div role="status" aria-live="polite"><h1 id="result-title" className="text-3xl font-bold leading-tight tracking-tight">{copy[0]}</h1><p className="mt-4 text-base leading-7 text-slate-600">{copy[1]}</p></div>
                    {money && <div className="mt-7 rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-600">{paid ? 'Importe confirmado' : 'Importe de la cuota'}</p><p className="mt-1 text-4xl font-bold tracking-tight">{money}</p>
                        {result?.startsAt && authorized && <p className="mt-3 text-sm text-slate-600">Inicio de la suscripción: {date(result.startsAt)}.</p>}
                        {result?.finite && result.endsAt && <p className="mt-3 text-sm leading-6 text-slate-600">Finalización: {date(result.endsAt)}. Sin renovación después de esa fecha.</p>}
                    </div>}
                    {(authorized || state === 'processing') && <p className="mt-5 flex gap-2 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />No repitas el pago ni hagas una transferencia mientras comprobamos esta operación.</p>}
                    <ResultRefresh pending={polling} />
                    <Link href="/portal" className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 py-3 font-semibold text-[#10294a]">Ir a mi cuenta <ArrowRight className="h-4 w-4" /></Link>
                    <p className="mt-3 text-center text-xs leading-5 text-slate-500">Solo necesitas iniciar sesión para consultar tu ficha y tu historial.</p>
                </div>
            </section>
            <p className="mt-7 text-center text-sm leading-6 text-slate-300">¿Necesitas ayuda? <a className="font-semibold text-[#e3c75b] underline underline-offset-4" href="https://wa.me/34691179600" rel="noreferrer">Habla con Academy</a></p>
        </div>
    </main>
}
