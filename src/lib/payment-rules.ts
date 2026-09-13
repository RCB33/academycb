export type PaymentMode = 'test' | 'live'

// Amounts must come from the database, never from a browser-supplied total.
export function eurosToCents(amount: string | number): number {
    const text = String(amount)
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Importe inválido: se admiten hasta dos decimales.')
    const [euros, decimals = ''] = text.split('.')
    const cents = Number(euros) * 100 + Number(decimals.padEnd(2, '0'))
    if (!Number.isSafeInteger(cents) || cents < 50 || cents > 100_000_000) throw new Error('Importe fuera del límite permitido para tarjeta.')
    return cents
}

export function validatePaymentEnvironment(env: { key?: string; deployment?: string; liveEnabled?: string; webhookSecret?: string }): PaymentMode {
    const mode = /^(?:rk|sk)_test_/.test(env.key || '') ? 'test' : /^(?:rk|sk)_live_/.test(env.key || '') ? 'live' : null
    if (!mode) throw new Error('No hay una clave Stripe válida.')
    if (env.deployment === 'production' && (mode !== 'live' || env.liveEnabled !== 'true')) throw new Error('Los cobros reales están desactivados.')
    if (env.deployment !== 'production' && mode !== 'test') throw new Error('No se permiten claves reales fuera de producción.')
    if (!env.webhookSecret?.startsWith('whsec_')) throw new Error('Falta configurar la confirmación segura de Stripe.')
    return mode
}

export function assertPaidSession(session: { id: string; livemode: boolean; payment_status: string; amount_total: number | null; currency: string | null; metadata: Record<string, string> | null }, expected: { sessionId: string; attemptId: string; amountCents: number; mode: PaymentMode }) {
    if (session.id !== expected.sessionId || session.metadata?.academy_attempt_id !== expected.attemptId) throw new Error('La sesión no corresponde al intento registrado.')
    if (session.livemode !== (expected.mode === 'live')) throw new Error('El modo de Stripe no coincide.')
    if (session.amount_total !== expected.amountCents || session.currency !== 'eur') throw new Error('El importe o la moneda no coincide con el recibo.')
    return session.payment_status === 'paid'
}
