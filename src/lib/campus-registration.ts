import { z } from 'zod'
export const CAMPUS_VERSION = 'navidad-2026-2027-v1'
export const campusWeeks = [
    { id: '1', label: '22, 23 y 24 de diciembre', price: 89 },
    { id: '2', label: '28, 29, 30 y 31 de diciembre', price: 99 },
    { id: '3', label: '4, 5 y 7 de enero', price: 89 },
]
export const participationTerms = [
    ['Fuerza mayor y condiciones externas', 'La organización no se hace responsable de la suspensión, modificación o cancelación total o parcial del campus por causas de fuerza mayor, incluidas condiciones meteorológicas adversas, decisiones de las autoridades competentes u otras situaciones que comprometan la seguridad de los participantes. En estos casos no se garantiza el reembolso, aunque se podrán ofrecer alternativas organizativas si es posible.'],
    ['Política de cancelación', 'En caso de desistimiento por parte del participante, no se reembolsarán las cantidades abonadas. La plaza podrá transferirse a otro participante con autorización previa de la organización.'],
    ['Pagos y compromiso', 'La inscripción implica la reserva de plaza y la planificación de grupos, actividades y recursos. Los importes abonados no son reembolsables.'],
    ['Desarrollo de las actividades', 'El campus combina actividades deportivas y recreativas. La organización se reserva el derecho a adaptar horarios, actividades o instalaciones según las necesidades organizativas o condiciones externas, garantizando la seguridad y calidad del servicio.'],
    ['Responsabilidad personal', 'La organización velará por el correcto desarrollo de las actividades, pero no se hace responsable de accidentes derivados de conductas inadecuadas o del incumplimiento de las normas por parte del participante.'],
    ['Objetos personales', 'Academy Costa Brava no se hace responsable de la pérdida, robo o deterioro de objetos personales durante el campus.'],
    ['Uso de instalaciones', 'El uso de las instalaciones se realizará bajo la supervisión del equipo técnico y siguiendo las normas establecidas. Los participantes deberán respetar las indicaciones del personal.'],
]
const text = (max = 150) => z.string().trim().min(1, 'Completa todos los campos obligatorios.').max(max)
const yesNo = z.enum(['Sí', 'No'], { error: 'Selecciona Sí o No en las autorizaciones.' })
export const campusRegistrationSchema = z.object({
    child_name: text(120),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
        const d = new Date(value + 'T00:00:00Z')
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value && value >= '2013-01-01' && value <= '2022-12-31'
    }, 'El campus es para nacidos entre 2013 y 2022.'),
    team: text(), role: z.enum(['Jugador de campo', 'Portero']),
    guardian_name: text(120), email: z.string().trim().email().max(200), phone: z.string().regex(/^\+?[0-9\s()-]{9,20}$/),
    allergies: text(1000), health_card: text(80), medical_consent: yesNo,
    weeks: z.array(z.enum(['1','2','3'])).min(1, 'Selecciona al menos una semana.').max(3).refine(v => new Set(v).size === v.length),
    preferences: z.string().trim().max(1000), size: z.string().trim().max(40), sibling: z.boolean(), sibling_name: z.string().trim().max(120),
    image_consent: yesNo, reason: text(), expectations: text(1000),
    payment_consent: z.literal(true), privacy_consent: z.literal(true), terms_consent: z.literal(true), health_consent: z.literal(true),
    website: z.string().max(0),
}).refine(v => v.weeks.length !== 3 || !!v.size, { message: 'Indica la talla de sudadera del pack completo.', path: ['size'] })
.refine(v => !v.sibling || !!v.sibling_name, { message: 'Indica el nombre del hermano ya inscrito.', path: ['sibling_name'] })
export function campusPrice(weeks: string[]) { return weeks.length === 3 ? 197 : campusWeeks.filter(w => weeks.includes(w.id)).reduce((total,w) => total + w.price, 0) }
