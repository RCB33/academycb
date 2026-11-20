import 'server-only'
import { stripeCheckoutMode } from '@/lib/stripe-availability'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { academyQuote, campusOfferSchema, groupSchema, planSchema, tournamentProgramSchema, type AcademyOffer, type CampusOffer, type TournamentOffer } from '@/lib/offering'

// Explicit projections: public consumers never receive staff, families or bank secrets.
export const groupColumns='id,name,schedule,category_id,max_players,status,public_offer,updated_at'
export const planColumns='id,name,description,price,enrollment_fee,sessions_per_week,season_start,season_end,is_active,updated_at'
export const campusColumns='id,name,start_date,end_date,location,schedule,status,public_program,updated_at'
export function offeringVersion(value:unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }

export async function getAcademyOffer(includeUnpublished=false):Promise<AcademyOffer> {
  const db=createAdminClient()
  const [groups,plans]=await Promise.all([
    db.from('teams').select(groupColumns).not('public_offer','is',null).order('created_at').order('id'),
    db.from('membership_plans').select(planColumns).not('sessions_per_week','is',null).order('sort_order').order('id'),
  ])
  if(groups.error||plans.error) throw new Error('No se pudo cargar la oferta de Academia. Inténtalo de nuevo.')
  const result={
    groups:(groups.data||[]).map(g=>({...groupSchema.parse(g),id:g.id,updated_at:g.updated_at})).filter(g=>includeUnpublished||(g.status==='active'&&g.public_offer.published)).sort((a,b)=>a.public_offer.order-b.public_offer.order),
    plans:(plans.data||[]).map(p=>({...planSchema.parse({...p,description:p.description||''}),id:p.id,updated_at:p.updated_at})).filter(p=>includeUnpublished||p.is_active),
  }
  return {...result,version:offeringVersion(result),recurring_available:process.env.STRIPE_RECURRING_PAYMENTS_ENABLED==='true'&&!!(await stripeCheckoutMode())}
}
export async function getCampusOffers(includeUnpublished=false):Promise<CampusOffer[]> {
  const {data,error}=await createAdminClient().from('campuses').select(campusColumns).not('public_program','is',null).order('start_date')
  if(error) throw new Error('No se pudo cargar la oferta de Campus.')
  return (data||[]).map(c=>({...campusOfferSchema.parse(c),id:c.id,updated_at:c.updated_at})).filter(c=>includeUnpublished||c.status==='published')
}
export async function getCampusOffer(id?:string) {
  const campuses=await getCampusOffers()
  return id?campuses.find(c=>c.id===id):campuses.find(c=>c.end_date>=new Date().toISOString().slice(0,10))
}
export async function getTournamentOffer():Promise<TournamentOffer> {
  const {data,error}=await createAdminClient().from('event_campaign_settings').select('public_program,updated_at').eq('id','christmas-2026').single()
  if(error||!data) throw new Error('No se pudo cargar la oferta de Torneos.')
  return {...tournamentProgramSchema.parse(data.public_program),version:data.updated_at}
}
export async function academySelection(input:{plan_id:string;group_id:string;second_group_id?:string;start_date:string;plus:boolean;offer_version:string;payment_choice:string},birthDate:string) {
  if(!['cash','monthly_card'].includes(input.payment_choice)) throw new Error('Elige efectivo o mensualidades con tarjeta para Academia.')
  const offer=await getAcademyOffer()
  if(input.offer_version!==offer.version) throw new Error('Los horarios o precios han cambiado. Recarga y revisa tu selección antes de enviarla.')
  const plan=offer.plans.find(p=>p.id===input.plan_id)
  const group=offer.groups.find(g=>g.id===input.group_id)
  const second=offer.groups.find(g=>g.id===input.second_group_id)
  if(!plan||!group) throw new Error('Selecciona un plan y un grupo disponibles.')
  if(plan.sessions_per_week===2&&(!second||second.id===group.id||second.public_offer.kind!=='sunday'||group.public_offer.kind==='sunday')) throw new Error('El plan de dos sesiones incluye un grupo entre semana y otro el domingo.')
  if(plan.sessions_per_week===1&&input.second_group_id) throw new Error('El plan seleccionado incluye una sesión semanal.')
  const groups=plan.sessions_per_week===2?[group,second!]:[group]
  for(const g of groups) {
    const {birth_from,birth_to}=g.public_offer
    const year=Number(birthDate.slice(0,4))
    if(birth_from!==null&&birth_to!==null&&(year<birth_from||year>birth_to)) throw new Error(`${g.name}: grupo para nacidos entre ${birth_from} y ${birth_to}.`)
  }
  if(input.start_date<new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})) throw new Error('Elige una fecha de incorporación actual o futura.')
  return {version:offer.version,plan,groups,start_date:input.start_date,payment_choice:input.payment_choice,quote:academyQuote(plan,input.start_date,input.plus)}
}
