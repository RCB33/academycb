import { billingReturnPath } from '@/lib/billing-request'
import { wallReturnPath } from '@/lib/community-social'
export function portalReturnPath(value: string | null) {
    return billingReturnPath(value) || wallReturnPath(value)
}
