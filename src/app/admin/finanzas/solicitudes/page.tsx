import { requireFinanceAccess } from '@/lib/auth'
import { BillingRequests } from '@/components/admin/billing-requests'
export default async function BillingRequestsPage(){await requireFinanceAccess();return <BillingRequests />}
