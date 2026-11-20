import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverRegistrationEmails } from '@/lib/registration-email'
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
  if(details?.payment_choice!=='monthly_card') return {status:details?.payment_choice==='cash'?'cash':'needs_review'}
  if(process.env.STRIPE_RECURRING_PAYMENTS_ENABLED!=='true') return {status:'pending_activation'}
  try {
    const {mode}=configuredStripe(true)
    if(!details?.accepted?.membership_id||!childId) return {error:'Falta confirmar la plaza antes de preparar el pago.'}
    const saved=await db.rpc('create_enrollment_billing_request',{request_input:requestId,actor_input:actorId,guardian_input:guardianId,mode_input:mode})
    if(saved.error) return {error:'Plaza aceptada. Revisa las mensualidades y sus vencimientos desde Finanzas antes de enviar el enlace.'}
    return {status:'ready',requestId,combined:true}
  } catch {return {error:'Plaza aceptada. Falta configurar el cobro mensual.'}}
}

// New assignment only: the queue is created atomically with the membership.
export async function finishManualAssignment(membershipId:string,childId:string) {
 const db=createAdminClient()
 const {data:row,error}=await db.from('registration_email_outbox').select('recipient').eq('source_type','membership').eq('source_id',membershipId).eq('event_kind','reviewed').maybeSingle()
 if(error||!row) return 'Plaza y cuotas creadas. Completa un único tutor principal con correo para poder enviar su confirmación.'
 const access=await onboardAcceptedFamily(childId,row.recipient)
 const {data:m}=await db.from('academy_memberships').select('plan_snapshot').eq('id',membershipId).single()
 if(m?.plan_snapshot) await db.from('academy_memberships').update({plan_snapshot:{...m.plan_snapshot,onboarding:{access:access.status||'needs_review'}}}).eq('id',membershipId)
 await deliverRegistrationEmails('membership',membershipId)
 const {data:delivery}=await db.from('registration_email_outbox').select('status').eq('source_type','membership').eq('source_id',membershipId).maybeSingle()
 return access.error||`Plaza y cuotas creadas. ${delivery?.status==='sent'?'Confirmación enviada al proveedor de correo.':'El correo está pendiente: revísalo en Estado de correos.'} No se ha realizado ningún cobro.`
}
