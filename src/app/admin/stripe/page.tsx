import { requireAdmin } from '@/lib/auth'
import { stripeTestRequest } from '@/lib/stripe-test'
import { StripeTestButton } from './test-button'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { CreditCard } from 'lucide-react'
import { ConfirmationRefresh } from './confirmation-refresh'

export const dynamic = 'force-dynamic'
function firstRelation<T>(value:T|T[]|null|undefined):T|null { return Array.isArray(value) ? value[0] || null : value || null }

export default async function StripeTestPage({ searchParams }: { searchParams: Promise<{ session_id?: string; cancelled?: string }> }) {
    const { user, supabase } = await requireAdmin()
    const params = await searchParams
    let connected = false, status = '', payment = ''
    let recurringReady = false
    try {
        await stripeTestRequest('checkout/sessions?limit=1')
        connected = true; status = 'Clave de pruebas aceptada por Stripe. Lectura de Checkout verificada.'
        try {
            await Promise.all(['prices?limit=1','products?limit=1','customers?limit=1','setup_intents?limit=1','invoices?limit=1','subscription_schedules?limit=1','subscriptions?limit=1'].map(path=>stripeTestRequest(path)))
            recurringReady = true
        } catch { /* Distinguish Checkout-only keys from recurring permissions. */ }
        if (params.session_id && /^cs_test_[a-zA-Z0-9]+$/.test(params.session_id)) {
            const session = await stripeTestRequest(`checkout/sessions/${params.session_id}`)
            if (session.livemode === false && session.metadata?.purpose === 'academy_connection_test' && session.metadata?.admin_id === user.id && session.amount_total === 100 && session.currency === 'eur') payment = session.payment_status === 'paid' ? 'Stripe confirma el pago ficticio. No se ha creado ningún pedido ni inscripción real.' : 'La sesión de prueba todavía no figura como pagada.'
        }
    } catch (error) { status = error instanceof Error ? error.message : 'No se pudo comprobar Stripe.' }
    const { data: attempts, error: ledgerError } = await supabase.from('stripe_test_attempts').select('id,state,created_at,confirmed_at,stripe_session_id').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(10)
    const { data: contracts, error: contractsError } = await supabase.from('academy_checkout_contracts').select('id,plan_name,state,billing_status,mode,choice,months,total_cents,academy_contract_collections(id),membership:academy_memberships(child:children(id,full_name))').order('created_at',{ascending:false}).limit(30)
    const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))
    const webhookConfirmed = !ledgerError && attempts?.some(attempt => attempt.state === 'paid' && attempt.confirmed_at)
    const returnedAttempt = attempts?.find(attempt => attempt.stripe_session_id === params.session_id)
    const awaitingConfirmation = Boolean(params.session_id && returnedAttempt && ['creating', 'open'].includes(returnedAttempt.state))
    const stateLabels: Record<string,string> = { creating: 'Preparando sesión', open: 'Pendiente de confirmación automática', paid: 'Confirmado y guardado por webhook', expired: 'Sesión caducada', failed: 'Pago fallido' }
    return <div className="mx-auto max-w-3xl space-y-5">
        <PortalPageHeader icon={<CreditCard />} eyebrow="Administración · Pruebas" title="Conexión Stripe" description="Diagnóstico privado. No activa cobros ni modifica pedidos." />
        <section className="space-y-4 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold text-navy">1. Conexión API</h2><p role="status">{status}</p>
            <h2 className="text-xl font-bold text-navy">2. Pago ficticio</h2>
            <p>Solo Preview y claves de pruebas. Usa la tarjeta de prueba 4242 4242 4242 4242, una fecha futura y un CVC ficticio. No introduzcas una tarjeta real.</p>
            {connected && !awaitingConfirmation && <StripeTestButton />}
            <ConfirmationRefresh pending={awaitingConfirmation} />
            {params.cancelled && <p>Has vuelto sin completar el pago. Volver no marca la sesión como pagada ni cancela un pago ya procesado.</p>}
            {payment && <p className="rounded-xl bg-gold/10 p-4">{payment} El registro automático se comprueba por separado debajo.</p>}
            <h2 className="text-xl font-bold text-navy">3. Confirmación automática</h2>
            <p>{webhookConfirmed ? 'Verificado: se ha recibido y guardado al menos un pago ficticio mediante un aviso firmado de Stripe.' : webhookConfigured ? 'Secreto configurado. Todavía no consta una confirmación de pago de pruebas en este registro.' : 'Pendiente: configurar STRIPE_WEBHOOK_SECRET en Preview y el destino en Stripe.'}</p>
            <p className="break-all rounded-xl bg-slate-50 p-3 font-mono text-sm">/api/stripe/webhook</p>
            <p className="text-sm text-slate-600">La URL debe ser accesible por Stripe. No desactives la protección de toda la web. Solo se confirma al recibir un aviso firmado y guardarlo; recarga para actualizar.</p>
            {ledgerError ? <p role="alert">No se pudo consultar el registro de pruebas.</p> : <ul className="space-y-2">{(attempts || []).map(attempt => <li key={attempt.id} className="rounded-xl border p-3 text-sm"><span className="font-semibold">{stateLabels[attempt.state] || attempt.state}</span><p className="text-slate-500">{new Date(attempt.created_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} · 1 € ficticio</p></li>)}{!attempts?.length && <li className="text-sm text-slate-500">Todavía no hay intentos registrados.</li>}</ul>}
            <h2 className="text-xl font-bold text-navy">4. Antes de activar ventas</h2>
            <p>{recurringReady ? 'Lectura de precios, clientes, suscripciones y programaciones: verificada.' : 'Falta verificar permisos de precios, clientes, suscripciones y programaciones. Una clave que sirve para Checkout puede no permitir mensualidades.'}</p>
            <p>Los recibos y planes se prueban desde el portal de la familia. El webhook debe recibir las facturas pagadas, los fallos o autorizaciones pendientes y las actualizaciones y bajas de suscripciones. La autorización de tarjeta no se muestra como dinero cobrado: esperamos la factura pagada.</p>
            <p className="text-sm text-slate-600">No activar ventas hasta completar un pago de cada módulo, una mensualidad y su finalización automática. Las pruebas no modifican la contabilidad real.</p>
            <h2 className="text-xl font-bold text-navy">5. Contratos y mensualidades</h2>
            {contractsError ? <p role="alert">No se pudo consultar el seguimiento de contratos.</p> : <ul className="space-y-3">{(contracts || []).map(c=>{const child=firstRelation(firstRelation(c.membership)?.child);return <li key={c.id} className="rounded-xl border p-4">
                <p className="font-semibold">{c.plan_name} · {c.mode==='test' ? 'PRUEBA' : 'Real'}</p>
                {child && <a className="text-sm underline" href={`/admin/crm/alumnos/${child.id}`}>{child.full_name}</a>}
                <p className="text-xs text-slate-500">Contrato {c.id.slice(0,8).toUpperCase()}</p>
                <p className="text-sm">{c.choice==='monthly' ? `${c.months} mensualidades` : 'Pago completo'} · Total {(Number(c.total_cents)/100).toFixed(2)} € · {c.academy_contract_collections?.length || 0} cobros confirmados.</p>
                <p className="text-sm">{({creating:'Preparando',open:'Pendiente de autorización',active:'Activado',completed:'Pagado por completo',expired:'Caducado',cancelled:'Cancelado'} as Record<string,string>)[c.state] || c.state}</p>
                {c.billing_status==='attention' && <p className="text-sm font-semibold text-amber-800">Revisar en Stripe: cuota pendiente o autorización bancaria necesaria.</p>}
                {c.billing_status==='ended' && <p className="text-sm">Programación finalizada{c.state!=='completed' ? '; revisar importes pendientes' : ''}.</p>}
            </li>})}{!contracts?.length && <li className="text-sm text-slate-600">Todavía no hay contratos online.</li>}</ul>}
        </section>
    </div>
}
