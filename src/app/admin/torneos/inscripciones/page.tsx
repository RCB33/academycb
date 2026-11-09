import { adminReadAll } from '@/lib/admin-read-all'
import { requireAdmin } from '@/lib/auth'
import Link from 'next/link'
import { RegistrationReview } from './review'
import { EventBankSettings } from './bank-settings'
import { ActivityNavigation } from '@/components/admin/activity-navigation'

export default async function EventRegistrationsAdminPage() {
  const { supabase } = await requireAdmin()
  const { data, error } = await adminReadAll((from,to)=>supabase.from('event_registrations').select('*').order('created_at', { ascending: false }).order('id').range(from,to))
  if (error) throw new Error('No se pudieron cargar las inscripciones de Navidad.')
  const { data: bank } = await supabase.from('event_campaign_settings').select('bank_holder').eq('id','christmas-2026').single()
  const [operations,history] = await Promise.all([
    adminReadAll((from,to)=>supabase.from('event_registration_operations').select('*').order('registration_id').range(from,to)),
    adminReadAll((from,to)=>supabase.from('event_registration_history').select('id,registration_id,action,note,created_at').order('created_at',{ascending:false}).order('id').range(from,to)),
  ])
  if(operations.error || history.error) throw new Error('No se pudo cargar el seguimiento de torneos.')
  const registrations=(data || []).map(r=>({...r,operations:operations.data.find(o=>o.registration_id===r.id),history:history.data.filter(h=>h.registration_id===r.id)}))
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><ActivityNavigation/><Link href="/admin/torneos" className="text-sm underline">← Torneos</Link><h1 className="text-3xl font-black text-navy">Inscripciones · Navidad 2026–2027</h1><p className="text-slate-600">Revisa cada jugador antes de solicitar el pago. Confirmar un ingreso crea un único registro pagado en Finanzas. Nunca confirmes solo porque haya una captura: comprueba el ingreso en el banco.</p><EventBankSettings holder={bank?.bank_holder || null} /><RegistrationReview registrations={registrations} /></main>
}
