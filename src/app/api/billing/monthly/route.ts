import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeCheckoutMode } from '@/lib/stripe-availability'
import { z } from 'zod'

// Creates a review link only. Card details and consent remain in Stripe Checkout.
export async function POST(request: Request) {
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
    if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Origen no permitido' }, 403)
    try {
        const { user } = await requireRole(['guardian'])
        if (!user.email_confirmed_at) return reply({ error: 'Confirma tu correo antes de añadir la tarjeta.' }, 403)
        const body = await request.text()
        if (body.length > 500) return reply({ error: 'Solicitud no válida' }, 400)
        const parsed = z.object({ guardianId: z.string().uuid() }).safeParse(JSON.parse(body))
        if (!parsed.success) return reply({ error: 'Solicitud no válida' }, 400)
        const mode = await stripeCheckoutMode()
        if (!mode || (mode === 'live' && process.env.STRIPE_RECURRING_PAYMENTS_ENABLED !== 'true')) return reply({ error: 'La autorización de mensualidades no está disponible ahora. Inténtalo más tarde.' }, 409)
        const { data, error } = await createAdminClient().rpc('prepare_parent_monthly_billing', { owner_input: user.id, guardian_input: parsed.data.guardianId, mode_input: mode })
        if (error) return reply({ error: 'Alguna cuota tiene un ajuste, un pago en curso o un calendario que necesita revisión. Contacta con Academy; no se ha iniciado ningún cobro.' }, 409)
        if (!data?.requestId) return reply({ error: 'No hay mensualidades futuras disponibles para autorizar. Revisa los pagos y las autorizaciones que ya aparecen en esta página.' }, 409)
        return reply({ url: `/portal/pagos/solicitud/${data.requestId}` })
    } catch {
        return reply({ error: 'No se pudo abrir la autorización. Inicia sesión con tu cuenta familiar y vuelve a intentarlo.' }, 403)
    }
}
