import { NextResponse } from 'next/server'
import { submitCombinedEnrollment } from '@/lib/combined-enrollment-server'
import { operationalLog } from '@/lib/operational-log'

export async function POST(request: Request) {
    operationalLog('registration.received', { source: 'registration' })
    const reject = (error: string, status: number) => {
        operationalLog('registration.rejected', { source: 'registration', status })
        return NextResponse.json({ success: false, error }, { status })
    }
    try {
        const origin = request.headers.get('origin')
        if (origin && origin !== new URL(request.url).origin) return reject('Origen no permitido.', 403)
        const raw = await request.text()
        if (new TextEncoder().encode(raw).byteLength > 96000) return reject('Formulario demasiado grande.', 413)
        let input: unknown
        try { input = JSON.parse(raw) } catch { return reject('Datos no válidos.', 400) }
        const result = await submitCombinedEnrollment(input)
        if (!result.success) return reject(result.error || 'Revisa los datos de la solicitud.', 400)
        operationalLog('registration.saved', { source: 'registration', status: 201 })
        return NextResponse.json(result, { status: 201 })
    } catch {
        operationalLog('request.failed', { source: 'registration', status: 503 })
        return NextResponse.json({ success: false, error: 'No se pudo comprobar el envío. Reintenta sin cambiar los datos; evitaremos duplicar la solicitud.' }, { status: 503 })
    }
}
