import { requireFinanceAccess } from '@/lib/auth'
import { BillingRequests } from '@/components/admin/billing-requests'
import { z } from 'zod'
export default async function BillingRequestsPage({searchParams}:{searchParams:Promise<{child_id?:string}>}){
 await requireFinanceAccess()
 const {child_id}=await searchParams
 const id=z.string().uuid().safeParse(child_id)
 return <BillingRequests initialChildId={id.success?id.data:''} />
}
