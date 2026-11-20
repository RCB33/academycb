import { requireAdmin } from '@/lib/auth'
import { OWNER_PILOT_ACCOUNT } from '@/lib/academy-owner-pilot'

const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// The owner completed and retired this one-off live test. Never reopen Checkout.
export async function POST(request: Request) {
    if (request.headers.get('origin') !== 'https://www.academycostabrava.com' || new URL(request.url).origin !== 'https://www.academycostabrava.com') return reply({ error: 'Origen no permitido' }, 403)
    try {
        const { user } = await requireAdmin()
        if (user.id !== OWNER_PILOT_ACCOUNT) return reply({ error: 'Cuenta no autorizada' }, 403)
        return reply({ error: 'La prueba de 1 € ha finalizado. El pago está registrado y no se puede repetir esta prueba.' }, 410)
    } catch { return reply({ error: 'No autorizado' }, 403) }
}
