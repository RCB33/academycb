import { requireAdmin } from '@/lib/auth'
import { configuredStripe } from '@/lib/stripe-payments'
import { stripeCheckoutMode } from '@/lib/stripe-availability'
import Link from 'next/link'

export async function StripeProductionStatus() {
    const { supabase } = await requireAdmin()
    const keyPresent = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '')
    const webhookPresent = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))
    let apiConnected = false
    let accountName = ''
    let canCharge: boolean | null = null
    if (keyPresent && webhookPresent) {
        try {
            const { stripe } = configuredStripe(true)
            await stripe.checkout.sessions.list({ limit: 1 })
            apiConnected = true
            try {
                const account = await stripe.accounts.retrieve(null)
                accountName = account.business_profile?.name || account.settings?.dashboard?.display_name || ''
                canCharge = account.charges_enabled
            } catch { /* Restricted keys may not have account-read permission. */ }
        } catch { /* Never return credential-bearing API errors to the browser. */ }
    }
    const enabled = (await stripeCheckoutMode()) === 'live'
    const [receipts, events, contracts] = await Promise.all([
        supabase.from('receipt_checkout_attempts').select('id,state,amount_cents,created_at').eq('mode','live').order('created_at',{ascending:false}).limit(10),
        supabase.from('event_checkout_attempts').select('id,state,amount_cents,created_at').eq('mode','live').order('created_at',{ascending:false}).limit(10),
        supabase.from('academy_checkout_contracts').select('id,state,billing_status,plan_name,total_cents').eq('mode','live').order('created_at',{ascending:false}).limit(10),
    ])
    const payments = [...(receipts.data || []), ...(events.data || [])].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,10)
    const labels: Record<string,string> = {creating:'Preparando enlace',open:'Pendiente de pago',paid:'Pago confirmado',expired:'Enlace caducado',failed:'Pago fallido'}
    return <div className="mx-auto max-w-3xl space-y-6">
        <header><p className="text-sm text-slate-500">Administración · Producción</p><h1 className="text-3xl font-bold text-navy">Conexión Stripe</h1><p className="mt-2 text-slate-600">Estado de los pagos con tarjeta de Academy.</p></header>
        <section className="space-y-3 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold">{enabled && apiConnected && canCharge !== false ? 'Pagos con tarjeta activados' : 'Activación pendiente'}</h2>
            <ul className="list-inside list-disc space-y-2 text-sm">
                <li>Clave de producción: {keyPresent ? 'guardada' : 'pendiente'}</li>
                <li>Confirmación automática: {webhookPresent ? 'secreto guardado; la entrega se verifica con un pago' : 'pendiente'}</li>
                <li>Conexión API: {apiConnected ? 'lectura de Checkout verificada' : 'pendiente de verificar'}</li>
                <li>Cuenta: {accountName || 'comprueba Academy Costa Brava en Stripe'}</li>
                <li>Cobros autorizados por Stripe: {canCharge === true ? 'sí' : canCharge === false ? 'no; completa la activación de la cuenta en Stripe' : 'comprueba el estado en Stripe'}</li>
                <li>Mensualidades automáticas: {process.env.STRIPE_RECURRING_PAYMENTS_ENABLED === 'true' ? 'habilitadas para planes compatibles' : 'pendientes de validación; las cuotas se pueden pagar por recibo'}</li>
                <li>Nuevos pagos en la web: {enabled ? 'habilitados' : 'desactivados'}</li>
            </ul>
            <p className="text-sm text-slate-600">Guardar las credenciales no confirma ningún pago. La web registra el cobro cuando recibe y verifica el aviso de Stripe.</p>
            <div className="flex flex-wrap gap-4 text-sm underline"><Link href="/admin/ajustes">Métodos de pago y planes</Link><a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">Abrir Stripe</a></div>
        </section>
        <section className="space-y-3 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Últimos intentos de pago</h2>
            {receipts.error || events.error ? <p role="alert">No se pudo consultar el registro completo.</p> : payments.length ? <ul className="space-y-2">{payments.map(p=><li key={p.id} className="rounded-lg border p-3 text-sm">{labels[p.state] || p.state} · {(Number(p.amount_cents)/100).toFixed(2)} €<p className="text-slate-500">{new Date(p.created_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</p></li>)}</ul> : <p className="text-sm text-slate-600">Todavía no hay intentos de cobro real.</p>}
        </section>
        <section className="space-y-3 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Planes con tarjeta</h2>
            {contracts.error ? <p role="alert">No se pudieron consultar los planes.</p> : contracts.data?.length ? contracts.data.map(c=><div key={c.id} className="rounded-lg border p-3 text-sm"><strong>{c.plan_name}</strong><p>{({creating:'Preparando',open:'Pendiente de autorización',active:'Activado',completed:'Pagado por completo',expired:'Caducado',cancelled:'Cancelado'} as Record<string,string>)[c.state] || c.state} · {(Number(c.total_cents)/100).toFixed(2)} €</p>{c.billing_status==='attention' && <p className="text-amber-800">Hay una cuota pendiente o una autorización bancaria por completar. Revisa Stripe.</p>}</div>) : <p className="text-sm text-slate-600">Todavía no hay planes contratados con tarjeta.</p>}
        </section>
    </div>
}
