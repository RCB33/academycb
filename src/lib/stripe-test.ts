import 'server-only'

export function stripeTestKey() {
    const key = process.env.STRIPE_SECRET_KEY || ''
    if (process.env.VERCEL_ENV !== 'preview') throw new Error('Esta prueba solo está disponible en Preview.')
    if (!key.startsWith('rk_test_') && !key.startsWith('sk_test_')) throw new Error('Falta una clave Stripe de pruebas válida en Preview.')
    return key
}

export async function stripeTestRequest(path: string, body?: URLSearchParams, idempotencyKey?: string) {
    const key = stripeTestKey()
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
        body, cache: 'no-store', signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
        if (response.status === 401) throw new Error('Stripe rechaza la clave. Comprueba que siga activa.')
        if (response.status === 403) throw new Error('La clave no tiene permiso para esta operación. Revisa Checkout Sessions: Escritura.')
        throw new Error(`Stripe no pudo completar la prueba (HTTP ${response.status}). Revisa los registros en Stripe.`)
    }
    return response.json()
}
