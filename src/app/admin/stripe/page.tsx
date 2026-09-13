import { requireAdmin } from '@/lib/auth'
import { stripeTestRequest } from '@/lib/stripe-test'
import { StripeTestButton } from './test-button'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StripeTestPage({ searchParams }: { searchParams: Promise<{ session_id?: string; cancelled?: string }> }) {
    const { user } = await requireAdmin()
    const params = await searchParams
    let connected = false, status = '', payment = ''
    try {
        await stripeTestRequest('checkout/sessions?limit=1')
        connected = true; status = 'Clave de pruebas aceptada por Stripe. Lectura de Checkout verificada.'
        if (params.session_id && /^cs_test_[a-zA-Z0-9]+$/.test(params.session_id)) {
            const session = await stripeTestRequest(`checkout/sessions/${params.session_id}`)
            if (session.livemode === false && session.metadata?.purpose === 'academy_connection_test' && session.metadata?.admin_id === user.id && session.amount_total === 100 && session.currency === 'eur') payment = session.payment_status === 'paid' ? 'Stripe confirma el pago ficticio. No se ha creado ningún pedido ni inscripción real.' : 'La sesión de prueba todavía no figura como pagada.'
        }
    } catch (error) { status = error instanceof Error ? error.message : 'No se pudo comprobar Stripe.' }
    return <div className="mx-auto max-w-3xl space-y-5"><PortalPageHeader icon={<CreditCard />} eyebrow="Administración · Pruebas" title="Conexión Stripe" description="Diagnóstico privado. No activa cobros ni modifica pedidos." /><section className="space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold text-navy">1. Conexión API</h2><p role="status">{status}</p><h2 className="text-xl font-bold text-navy">2. Pago ficticio</h2><p>Solo Preview y claves de pruebas. Usa la tarjeta de prueba 4242 4242 4242 4242, una fecha futura y un CVC ficticio. No introduzcas una tarjeta real.</p>{connected && <StripeTestButton />}{params.cancelled && <p>Prueba cancelada. No se ha marcado nada como pagado.</p>}{payment && <p className="rounded-xl bg-gold/10 p-4">{payment}</p>}<h2 className="text-xl font-bold text-navy">3. Pendiente antes de activar ventas</h2><p>Conectar pedidos, cuotas e inscripciones y configurar el webhook firmado. Esta prueba confirma únicamente la conexión y Checkout; no sustituye la confirmación automática del negocio.</p></section></div>
}
