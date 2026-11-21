import { FamilyPaymentView } from '@/components/management/family-payment-view'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import type { BillingRequest } from '@/lib/billing-request'
import { FamilyPaymentControls } from './controls'
export default async function FamilyPaymentPage({params}:{params:Promise<{id:string}>}) {
 const {supabase}=await requireAdmin(),{id}=await params
 if(!z.string().uuid().safeParse(id).success)notFound()
 const {data:members,error}=await supabase.from('family_billing_members').select('request:enrollment_requests(id,child_name,guardian_name,email,status,academy_details)').eq('batch_id',id)
 if(error||!members?.length)notFound()
 const requests=members.flatMap(m=>Array.isArray(m.request)?m.request:[m.request]).filter(Boolean)
 const {data:raw,error:billingError}=await supabase.from('billing_requests').select('*,billing_request_items(*)').eq('id',id).maybeSingle()
 if(billingError)throw billingError
 const r=raw as BillingRequest|null,pending=requests.some(r=>['new','contacted','interested'].includes(r.status))
 return <FamilyPaymentView id={id} requests={requests} r={r} controls={(!r||r.state==='ready')?<FamilyPaymentControls id={id} ready={!!r} pending={pending}/>:undefined}/>
}
