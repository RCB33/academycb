import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { campusRegistrationSchema, campusPrice, campusWeeks, CAMPUS_VERSION } from '@/lib/campus-registration'
export async function POST(request: Request) {
    if (new Date() > new Date('2027-01-07T13:00:00Z')) return NextResponse.json({ error: 'Esta edición ya ha finalizado.' }, { status: 400 })
    let payload: unknown
    try { payload = await request.json() } catch { return NextResponse.json({ error: 'Datos no válidos.' }, { status: 400 }) }
    const parsed = campusRegistrationSchema.safeParse(payload)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const d = parsed.data
    const details = [
        `Formulario: ${CAMPUS_VERSION} · ${new Date().toISOString()}`,
        `Equipo: ${d.team}`, `Modalidad: ${d.role}`,
        `Semanas: ${campusWeeks.filter(w => d.weeks.includes(w.id as '1'|'2'|'3')).map(w => w.label).join('; ')}`,
        `Tarifa base: ${campusPrice(d.weeks)} €`, `Segundo hermano: ${d.sibling ? d.sibling_name + ' (5 % pendiente de verificar)' : 'No'}`,
        `Preferencias: ${d.preferences || 'Ninguna'}`, `Talla sudadera: ${d.size || 'No corresponde'}`,
        `Alergias: ${d.allergies}`, `Tarjeta sanitaria: ${d.health_card}`, `Autoriza asistencia médica: ${d.medical_consent}`,
        `Autoriza imágenes: ${d.image_consent}`, `Motivo: ${d.reason}`, `Expectativas: ${d.expectations}`,
        'Acepta condiciones de pago, privacidad, tratamiento de datos de salud y participación: Sí',
        'Pago: pendiente de comprobación. Plaza: pendiente de confirmación.',
    ].join('\n')
    const supabase = await createClient()
    const { error } = await supabase.from('enrollment_requests').insert({ service: 'campus', activity_name: 'Campus Navidad 2026–2027', child_name: d.child_name, birth_date: d.birth_date, guardian_name: d.guardian_name, email: d.email.toLowerCase(), phone: d.phone, notes: details, campus_details: d, status: 'new' })
    if (error) return NextResponse.json({ error: 'No se ha podido guardar la inscripción. Inténtalo de nuevo o llama al 691 17 96 00.' }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 201 })
}
