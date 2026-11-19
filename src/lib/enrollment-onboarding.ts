import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe } from '@/lib/stripe-payments'

// Called only after an administrator commits acceptance. Never reset an existing
// family's password, and never infer that a provider response proves inbox delivery.
export async function onboardAcceptedFamily(childId:string,email:string) {
  const db=createAdminClient()
  const {data:links,error}=await db.from('child_guardians').select('guardian:guardians(id,email,full_name,user_id)').eq('child_id',childId)
  if(error) return {error:'Plaza aceptada. Falta comprobar el acceso familiar.'}
  const guardians=(links||[]).flatMap(l=>Array.isArray(l.guardian)?l.guardian:[l.guardian]).filter(g=>g?.email?.trim().toLowerCase()===email.trim().toLowerCase())
  if(guardians.length!==1) return {error:'Plaza aceptada. Revisa las fichas de tutor antes de enviar el acceso.'}
  const guardian=guardians[0]
  if(guardian.user_id) {
    const {data,error}=await db.auth.admin.getUserById(guardian.user_id)
    if(error||!data.user||data.user.email?.toLowerCase()!==email.toLowerCase()||(data.user.banned_until&&new Date(data.user.banned_until)>new Date())) return {error:'Revisa el acceso del tutor; la cuenta no se ha modificado.'}
    return {guardianId:guardian.id,status:'existing'}
  }
  for(let page=1;;page++) {
    const {data,error}=await db.auth.admin.listUsers({page,perPage:1000})
    if(error) return {error:'Plaza aceptada. No se pudo comprobar la cuenta familiar.'}
    const existing=data.users.find(u=>u.email?.trim().toLowerCase()===email.trim().toLowerCase())
    if(existing) {
      if(!existing.email_confirmed_at||(existing.banned_until&&new Date(existing.banned_until)>new Date())) return {error:'El tutor debe verificar su correo o revisar el estado de su cuenta antes de vincularla.'}
      const linked=await db.rpc('link_verified_guardian_account',{guardian_input:guardian.id,user_input:existing.id,email_input:existing.email!})
      if(linked.error) return {error:'Plaza aceptada. Revisa los vínculos de la cuenta del tutor.'}
      return {guardianId:guardian.id,status:'existing'}
    }
    if(data.users.length<1000) break
  }
  const site=process.env.NEXT_PUBLIC_SITE_URL
  if(!site?.startsWith('https://')) return {error:'Plaza aceptada. Falta configurar el enlace de acceso.'}
  const {data,error:inviteError}=await db.auth.admin.inviteUserByEmail(email,{data:{full_name:guardian.full_name,intended_role:'guardian',password_set:false},redirectTo:`${site.replace(/\/$/,'')}/portal/establecer-contrasena`})
  if(inviteError||!data.user) return {error:'Plaza aceptada. No se pudo enviar el acceso; revisa el tutor y reintenta desde su ficha.'}
  const saved=await db.from('guardians').update({user_id:data.user.id}).eq('id',guardian.id).is('user_id',null).select('id').maybeSingle()
  if(saved.error||!saved.data) return {error:'La invitación se ha solicitado, pero falta confirmar el vínculo familiar. Revisa la ficha del tutor.'}
  return {guardianId:guardian.id,status:'invited'}
}

export async function prepareAcceptedSubscription(requestId:string,actorId:string,childId:string,guardianId:string) {
  const db=createAdminClient()
  const {data:request}=await db.from('enrollment_requests').select('academy_details').eq('id',requestId).single()
  const details=request?.academy_details
  if(details?.payment_choice!=='monthly_card') return {status:'transfer'}
  const {data:receipts,error}=await db.from('payments').select('id').eq('ref_id',details.accepted.membership_id).eq('concept_code','monthly').gt('covered_month',details.start_date.slice(0,7)).in('status',['pending','failed']).order('due_date')
  if(error) return {error:'Falta preparar las mensualidades desde Finanzas.'}
  if(!receipts?.length) return {status:'last_month'}
  if(process.env.STRIPE_RECURRING_PAYMENTS_ENABLED!=='true') return {status:'pending_activation'}
  try {
    const {mode}=configuredStripe(true)
    const saved=await db.rpc('create_billing_request',{id_input:requestId,actor_input:actorId,child_input:childId,guardian_input:guardianId,kind_input:'subscription',mode_input:mode,title_input:`Mensualidades · ${details.plan.name}`.slice(0,150),payments_input:receipts.map(r=>r.id)})
    if(saved.error) return {error:'Plaza aceptada. Revisa las mensualidades y sus vencimientos desde Finanzas antes de enviar el enlace.'}
    return {status:'ready',requestId}
  } catch {return {error:'Plaza aceptada. Falta configurar el cobro mensual.'}}
}
