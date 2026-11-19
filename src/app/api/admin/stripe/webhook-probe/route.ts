import { requireAdmin } from '@/lib/auth'
import { readWebhookProbe, startWebhookProbe } from '@/lib/stripe-webhook-probe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
    // This cookie-authenticated mutation accepts only same-origin browser calls.
    if (request.headers.get('origin') !== new URL(request.url).origin ||
        request.headers.get('content-type') !== 'application/json') return response({ error: 'Origen no permitido.' }, 403)
    let user
    try { ({ user } = await requireAdmin()) }
    catch { return response({ error: 'Acceso exclusivo para administradores.' }, 403) }
    try { return response({ probe: await startWebhookProbe(user.id) }) }
    catch { return response({ error: 'Stripe no ha completado la prueba. Revisa los permisos de Checkout Sessions y Productos/Precios. No se ha solicitado ningún cargo. Consulta el estado antes de repetir.' }, 502) }
}

export async function GET(request: Request) {
    try { await requireAdmin() }
    catch { return response({ error: 'Acceso exclusivo para administradores.' }, 403) }
    const id = new URL(request.url).searchParams.get('session_id') || undefined
    if (id && !/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return response({ error: 'Referencia inválida.' }, 400)
    try { return response({ probe: await readWebhookProbe(id) }) }
    catch { return response({ error: 'No se pudo consultar la prueba técnica.' }, 502) }
}
