import { NextResponse } from 'next/server'
import { submitCombinedEnrollment } from '@/lib/combined-enrollment-server'

export async function POST(request: Request) {
    const origin=request.headers.get('origin')
    if(origin&&origin!==new URL(request.url).origin) return NextResponse.json({error:'Origen no permitido.'},{status:403})
    const raw=await request.text()
    if(new TextEncoder().encode(raw).byteLength>96000) return NextResponse.json({error:'Formulario demasiado grande.'},{status:413})
    let input:unknown
    try {input=JSON.parse(raw)} catch {return NextResponse.json({error:'Datos no válidos.'},{status:400})}
    try {
        const result=await submitCombinedEnrollment(input)
        return NextResponse.json(result,{status:result.success?201:400})
    } catch {return NextResponse.json({error:'No se pudo comprobar el envío. Reintenta sin cambiar los datos; evitaremos duplicar la solicitud.'},{status:503})}
}
