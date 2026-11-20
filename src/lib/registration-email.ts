import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { registrationEmailDetails } from '@/lib/registration-email-details'
import { renderCommunicationEmail } from '@/lib/communication-email'
import { registrationEmailContent } from '@/lib/registration-email-content'

// Internal helper, never a public server action. Failure cannot undo a saved request.
export async function deliverRegistrationEmails(source: 'enrollment' | 'event' | 'membership', sourceId: string) {
  try {
    const db = createAdminClient()
    const { data, error } = await db.from('registration_email_outbox').select('id').eq('source_type', source).eq('source_id', sourceId).neq('status', 'sent').order('created_at').limit(10)
    if (error) throw error
    for (const row of data || []) await deliverRegistrationEmail(row.id)
  } catch { console.error('registration_email_queue_unavailable') }
}

export async function deliverRegistrationEmail(id: string) {
  try {
    const db = createAdminClient()
    const { data, error } = await db.rpc('claim_registration_email', { message_id: id })
    if (error) throw error
    const row = data?.[0]
    if (!row) return
    let failure = 'provider_unavailable'
    try {
      if (!process.env.RESEND_API_KEY) { failure = 'missing_api_key'; throw new Error(failure) }
      const details=await registrationEmailDetails(row.source_type,row.source_id,row.event_kind)
      const content=details?{subject:details.subject,text:details.message+(details.familyAccess&&details.familyAccess!=='pending'?`\n\nTu email de acceso: ${row.recipient}`:''),html:renderCommunicationEmail(details.subject,details.message,details.action,details.familyAccess?{email:row.recipient,status:details.familyAccess}:undefined)}:registrationEmailContent(row.source_type,row.event_kind)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `registration-${row.id}` },
        body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'Academy Costa Brava <info@academycostabrava.com>', to: [row.recipient], reply_to: 'costabravaacademy@gmail.com', ...content }),
      })
      if (!response.ok) { failure = `provider_http_${response.status}`; throw new Error(failure) }
      const result = await response.json()
      if (typeof result.id !== 'string') throw new Error('invalid_provider_response')
      const saved = await db.from('registration_email_outbox').update({ status: 'sent', provider_id: result.id, sent_at: new Date().toISOString(), last_error: null }).eq('id', id).eq('status', 'sending')
      if (saved.error) throw saved.error
      return
    } catch {
      await db.from('registration_email_outbox').update({ status: 'failed', last_error: failure }).eq('id', id).eq('status', 'sending')
    }
  } catch { console.error('registration_email_delivery_failed') }
}
