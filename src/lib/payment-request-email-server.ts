import 'server-only'
import { createAdminClient } from './supabase/admin'
import { type BillingRequest } from './billing-request'
import { paymentRequestEmail } from './payment-request-email'

// Preview and delivery use the same current, server-side recipient and content.
export async function preparePaymentRequestEmail(r: BillingRequest & { recipient_email: string | null }, origin: string) {
    const db = createAdminClient()
    const [child, guardian, link, bank] = await Promise.all([
        db.from('children').select('full_name,archived_at').eq('id',r.child_id).single(),
        db.from('guardians').select('full_name,email,user_id').eq('id',r.guardian_id).single(),
        db.from('child_guardians').select('guardian_id').eq('child_id',r.child_id).eq('guardian_id',r.guardian_id).maybeSingle(),
        db.from('event_campaign_settings').select('iban,bank_holder').eq('id','christmas-2026').single(),
    ])
    if (child.error || guardian.error || link.error || bank.error || !child.data || child.data.archived_at || !guardian.data?.user_id || !link.data || !bank.data?.iban || guardian.data.email?.trim().toLowerCase() !== r.recipient_email?.trim().toLowerCase()) throw new Error('Revisa el jugador y la cuenta del tutor antes de enviar el enlace.')
    return paymentRequestEmail({ request:r, childName:child.data.full_name, guardianName:guardian.data.full_name, origin, bank:bank.data })
}
