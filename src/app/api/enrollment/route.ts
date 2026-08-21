import { NextResponse } from 'next/server'
import { createEnrollmentRequest } from '@/lib/enrollment'

export async function POST(request: Request) {
    let payload: unknown
    try {
        payload = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'No se han recibido datos válidos.' }, { status: 400 })
    }

    const result = await createEnrollmentRequest(payload)
    return NextResponse.json(result, { status: result.success ? 201 : 400 })
}
