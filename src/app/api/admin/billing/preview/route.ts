import { requireFinanceAccess } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { preparePaymentRequestEmail } from '@/lib/payment-request-email-server'
import { stripePaymentOrigin } from '@/lib/stripe-return-origin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
    const reply = (body:unknown,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
    try { await requireFinanceAccess() } catch { return reply({error:'Sin permisos'},403) }
    const id = new URL(request.url).searchParams.get('id')
    if (!z.string().uuid().safeParse(id).success) return reply({error:'Solicitud no válida'},400)
    const {data:r,error} = await createAdminClient().from('billing_requests').select('*,billing_request_items(*)').eq('id',id!).single()
    if (error || !r) return reply({error:'Solicitud no disponible'},404)
    try {
        const origin = stripePaymentOrigin(new URL(request.url).origin,r.mode,process.env.VERCEL_URL)
        const content = await preparePaymentRequestEmail(r,origin)
        return reply({recipient:r.recipient_email,...content})
    } catch { return reply({error:'Revisa el jugador, el tutor y las cuotas de esta solicitud.'},409) }
}
