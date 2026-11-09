import { requireAdmin } from '@/lib/auth'
import Link from 'next/link'
import { RegistrationReview } from './review'
import { EventBankSettings } from './bank-settings'

export default async function EventRegistrationsAdminPage() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('event_registrations').select('*').order('created_at', { ascending: false })
  if (error) throw new Error('No se pudieron cargar las inscripciones de Navidad.')
  const { data: bank } = await supabase.from('event_campaign_settings').select('bank_holder').eq('id','christmas-2026').single()
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><Link href="/admin/torneos" className="text-sm underline">← Torneos</Link><h1 className="text-3xl font-black text-navy">Inscripciones · Navidad 2026–2027</h1><p className="text-slate-600">Revisa cada jugador antes de solicitar el pago. Confirmar un ingreso crea un único registro pagado en Finanzas. Nunca confirmes solo porque haya una captura: comprueba el ingreso en el banco.</p><EventBankSettings holder={bank?.bank_holder || null} /><RegistrationReview registrations={data || []} /></main>
}
