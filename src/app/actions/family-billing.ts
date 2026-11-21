'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { prepareFamilyBilling } from '@/lib/family-billing'
import { onboardAcceptedFamily } from '@/lib/enrollment-onboarding'
export async function prepareFamilyPayment(id:string) {
 const {user,supabase}=await requireAdmin()
 if(!z.string().uuid().safeParse(id).success)return {error:'Familia no válida.'}
 const {data:members,error}=await supabase.from('family_billing_members').select('request:enrollment_requests(status,email,accepted_child_id,academy_details)').eq('batch_id',id)
 if(error||!members?.length)return {error:'No se pudo cargar la solicitud familiar.'}
 const requests=members.flatMap(m=>Array.isArray(m.request)?m.request:[m.request]).filter(Boolean)
 if(requests.some(r=>['new','contacted','interested'].includes(r.status)))return {error:'Revisa primero todas las plazas de esta familia.'}
 if(!requests.some(r=>r.status==='enrolled'&&r.academy_details?.payment_choice==='monthly_card'))return {error:'No quedan plazas aceptadas con tarjeta en este envío.',status:'no_card'}
 for(const r of requests.filter(r=>r.status==='enrolled'&&r.academy_details?.payment_choice==='monthly_card')) {
  const access=await onboardAcceptedFamily(r.accepted_child_id,r.email)
  if(access.error)return {error:access.error}
 }
 const result=await prepareFamilyBilling(id,user.id)
 revalidatePath('/admin/solicitudes','layout');revalidatePath('/portal/pagos')
 return {error:'error' in result?result.error:result.status==='pending_activation'?'La modalidad Stripe no está activa.':result.status==='no_card'?'No quedan plazas aceptadas con tarjeta en este envío.':undefined,status:result.status}
}
