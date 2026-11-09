import { z } from 'zod'

export const christmasTournaments = [
  { id: '231', name: '231 Cup', date: '27 diciembre 2026', location: 'Santa Coloma de Farners y Sils', categories: ['S9', 'S10', 'S11', 'S12'], image: '/academy-gallery-6.jpg', description: 'Representa a Academy en la Winter Edition: fútbol, nuevos compañeros y una jornada para disfrutar compitiendo.', includes: 'Welcome pack, agua, fruta y premios deportivos.', dates: '27 de diciembre. Horario y campo por concretar.' },
  { id: 'champions', name: 'Champions Dream', date: '27, 28 y 29 diciembre 2026', location: 'Zona Garraf y Baix Llobregat', categories: ['S7', 'S8', 'S9', 'S10', 'S11', 'S12'], image: '/academy-gallery-1.jpg', description: 'Vive el torneo de tus sueños con Academy. Fase de grupos, oro y plata, con partidos de 20 minutos.', includes: 'Seguro de accidentes, agua y fruta. Ropa del torneo opcional, sin selección de talla; se devuelve al finalizar.', dates: '27: prebenjamines 2020/2019 y Primera 2018–2015. 28: Preferente 2018/2017. 29: Preferente 2016/2015. Horarios y campos por concretar.' },
  { id: 'costa-brava', name: 'Winter Costa Brava Cup', date: '2 y 3 enero 2027', location: 'Platja d’Aro, Castell d’Aro, Sant Feliu de Guíxols y Tossa de Mar', categories: ['S8', 'S9', 'S10', 'S11', 'S12', 'Infantil F11'], image: '/academy-gallery-2.jpg', description: 'Nuestro torneo, coorganizado con una entidad colaboradora. Súmate a los equipos Academy y vive una jornada de fútbol en la Costa Brava.', includes: 'Mínimo 4 partidos, fases oro y plata, árbitros federados, cobertura para jugadores, agua, fruta y regalo de bienvenida.', dates: '2 enero: S11, S12 e Infantil F11. 3 enero: S8, S9 y S10. Un día por categoría. Campo y horario concretos por confirmar.' },
] as const

export const tournamentIds = ['231', 'champions', 'costa-brava'] as const
export const registrationStatuses: Record<string, string> = { requested: 'Pendiente de validación', awaiting_payment: 'Pendiente de transferencia', proof_review: 'Justificante en revisión', confirmed: 'Inscripción confirmada', cancelled: 'Anulada' }
export const tournamentRegistrationSchema = z.object({
  request_id: z.string().uuid(), child_id: z.string().uuid().nullable(),
  child_name: z.string().trim().min(3).max(120), birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + 'T12:00:00Z'); return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d <= new Date() }, 'Revisa la fecha de nacimiento.'),
  guardian_name: z.string().trim().min(3).max(120), phone: z.string().trim().regex(/^\+?[\d\s()-]{9,20}$/, 'Revisa el teléfono'),
  club: z.string().trim().min(2).max(120), coach: z.string().trim().max(120),
  category: z.enum(['S7','S8','S9','S10','S11','S12','Infantil F11']), level: z.enum(['primera','preferente','segunda','otra','sin_equipo']),
  tournaments: z.array(z.enum(tournamentIds)).min(1).max(3).refine(a => new Set(a).size === a.length),
  owns_kit: z.boolean(), shirt_size: z.string().max(20), shorts_size: z.string().max(20), socks_size: z.string().max(20), champions_clothing: z.boolean(),
  image_consent: z.boolean(), privacy_consent: z.literal(true), terms_consent: z.literal(true), participation_consent: z.literal(true), notes: z.string().trim().max(1500),
}).superRefine((v, ctx) => {
  for (const id of v.tournaments) {
    const event = christmasTournaments.find(t => t.id === id)!
    if (!(event.categories as readonly string[]).includes(v.category)) ctx.addIssue({ code: 'custom', path: ['tournaments'], message: `${event.name} no ofrece ${v.category}.` })
  }
  if (v.tournaments.some(t => t !== 'champions') && !v.owns_kit && (!v.shirt_size || !v.shorts_size || !v.socks_size)) ctx.addIssue({ code: 'custom', path: ['shirt_size'], message: 'Selecciona las tres tallas de la equipación.' })
})

export type TournamentRegistrationInput = z.infer<typeof tournamentRegistrationSchema>
export function tournamentQuote(ids: readonly string[], ownsKit: boolean) {
  if (!ids.length || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !(tournamentIds as readonly string[]).includes(id))) throw new Error('Selección de torneos no válida')
  const tournaments = [0, 65, 120, 165][ids.length]
  const kit = ids.some(id => id !== 'champions') && !ownsKit ? 55 : 0
  return { tournaments, kit, total: tournaments + kit, reviewCompatibility: ids.includes('231') && ids.includes('champions') }
}
