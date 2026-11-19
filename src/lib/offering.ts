import { z } from 'zod'

const text = z.string().trim().min(1).max(300)
const money = z.number().finite().min(0).max(10000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Usa como máximo dos decimales.')
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Fecha no válida.')
export const groupOfferSchema = z.object({
  day: z.enum(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']),
  kind: z.enum(['field', 'keeper', 'sunday']), location: text,
  birth_from: z.number().int().min(1990).max(2040).nullable(), birth_to: z.number().int().min(1990).max(2040).nullable(),
  published: z.boolean(), note: z.string().trim().max(500), order: z.number().int().min(0).max(1000),
}).refine(v => (v.birth_from === null && v.birth_to === null) || (v.birth_from !== null && v.birth_to !== null && v.birth_from <= v.birth_to), 'Indica los dos años de nacimiento, en orden, o deja ambos vacíos.')
export const groupSchema = z.object({ name: text, schedule: text, category_id: z.string().uuid().nullable(), max_players: z.number().int().min(1).max(500).nullable(), status: z.enum(['active','inactive']), public_offer: groupOfferSchema })
export const planSchema = z.object({ name: text, description: z.string().trim().max(1000), price: money.refine(n => n > 0), enrollment_fee: money, sessions_per_week: z.union([z.literal(1),z.literal(2)]), season_start: calendarDate, season_end: calendarDate, is_active: z.boolean() }).refine(v => v.season_end >= v.season_start, 'La temporada termina después de empezar.')
export const campusProgramSchema = z.object({
  weeks: z.array(z.object({ id: z.enum(['1','2','3']), label: text, price: money, dates: z.array(calendarDate).min(1).max(7) })).length(3),
  pack_price: money, birth_from: z.number().int().min(1990).max(2040), birth_to: z.number().int().min(1990).max(2040),
  sibling_discount: z.number().min(0).max(100), daily_schedule: z.array(z.tuple([text,text])).min(1).max(20),
  keeper_training: text, keeper_games: text,
}).superRefine((v,ctx) => {
  if (new Set(v.weeks.map(w => w.id)).size !== 3) ctx.addIssue({code:'custom',message:'Las tres semanas deben tener identificadores diferentes.'})
  if (v.birth_from > v.birth_to) ctx.addIssue({code:'custom',message:'Revisa los años de nacimiento.'})
  const dates = v.weeks.flatMap(w => w.dates)
  if (new Set(dates).size !== dates.length) ctx.addIssue({code:'custom',message:'No repitas días entre semanas.'})
  if (v.pack_price > v.weeks.reduce((n,w) => n+w.price,0)) ctx.addIssue({code:'custom',message:'El pack no puede costar más que las semanas sueltas.'})
})
export const campusOfferSchema = z.object({name:text, start_date:calendarDate, end_date:calendarDate, location:text, schedule:text, status:z.enum(['draft','published','closed','archived']), public_program:campusProgramSchema}).superRefine((v,ctx) => {
  if(v.start_date>v.end_date || v.public_program.weeks.flatMap(w=>w.dates).some(d=>d<v.start_date||d>v.end_date)) ctx.addIssue({code:'custom',message:'Todos los días del programa deben estar dentro de las fechas del campus.'})
})
export const tournamentProgramSchema = z.object({
  events: z.array(z.object({ id:z.enum(['231','champions','costa-brava']), name:text, date:text, location:text, categories:z.array(z.enum(['S7','S8','S9','S10','S11','S12','Infantil F11'])).min(1).max(7), image:z.string().regex(/^\/[\w/.-]+$/), description:z.string().min(1).max(1500), includes:z.string().min(1).max(1500), dates:z.string().min(1).max(1500) })).length(3),
  prices:z.tuple([money,money,money]), kit_price:money,
}).refine(v=>new Set(v.events.map(e=>e.id)).size===3,'Los torneos no pueden repetirse.')
export type GroupOffer=z.infer<typeof groupOfferSchema>
export type AcademyGroup=z.infer<typeof groupSchema>&{id:string;updated_at:string}
export type AcademyPlan=z.infer<typeof planSchema>&{id:string;updated_at:string}
export type AcademyOffer={groups:AcademyGroup[];plans:AcademyPlan[];version:string;recurring_available?:boolean}
export type CampusProgram=z.infer<typeof campusProgramSchema>
export type CampusOffer=z.infer<typeof campusOfferSchema>&{id:string;updated_at:string}
export type TournamentProgram=z.infer<typeof tournamentProgramSchema>
export type TournamentOffer=TournamentProgram&{version:string}

export function firstMonthPercent(startDate:string) {
  calendarDate.parse(startDate)
  const day=Number(startDate.slice(8,10))
  return day<=7?100:day<=15?75:day<=22?50:25
}
export function academyQuote(plan:AcademyPlan,startDate:string,plus:boolean) {
  calendarDate.parse(startDate)
  if(startDate<plan.season_start||startDate>plan.season_end) throw new Error('La fecha de incorporación debe estar dentro de la temporada.')
  const percent=firstMonthPercent(startDate)
  const first_month=Math.round(plan.price*percent)/100
  const end=plan.season_end.slice(0,7)
  const remaining:{month:string;amount:number;due_date:string}[]=[]
  const date=new Date(`${startDate.slice(0,7)}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth()+1)
  while(date.toISOString().slice(0,7)<=end) {
    const month=date.toISOString().slice(0,7)
    remaining.push({month,amount:plan.price,due_date:`${month}-01`})
    date.setUTCMonth(date.getUTCMonth()+1)
  }
  return {percent,first_month,monthly_price:plan.price,enrollment_fee:plan.enrollment_fee,plus:plus?50:0,first_total:Math.round((first_month+plan.enrollment_fee+(plus?50:0))*100)/100,remaining,season_end:plan.season_end,payment_day:1,follow_up_day:5}
}
export function offerCampusPrice(weeks:readonly string[],program:CampusProgram) {
  if(!weeks.length||new Set(weeks).size!==weeks.length||weeks.some(id=>!program.weeks.some(w=>w.id===id))) throw new Error('Selecciona semanas disponibles.')
  return weeks.length===program.weeks.length?program.pack_price:Math.round(program.weeks.filter(w=>weeks.includes(w.id)).reduce((n,w)=>n+w.price,0)*100)/100
}
export function offerTournamentQuote(ids:readonly string[],ownsKit:boolean,program:TournamentProgram) {
  if(!ids.length||ids.length>3||new Set(ids).size!==ids.length||ids.some(id=>!program.events.some(e=>e.id===id))) throw new Error('Selección de torneos no válida.')
  const tournaments=program.prices[ids.length-1],kit=ids.some(id=>id!=='champions')&&!ownsKit?program.kit_price:0
  return {tournaments,kit,total:Math.round((tournaments+kit)*100)/100,reviewCompatibility:ids.includes('231')&&ids.includes('champions')}
}
