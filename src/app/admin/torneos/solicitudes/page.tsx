import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { adminReadAll } from '@/lib/admin-read-all'
import { ActivityNavigation } from '@/components/admin/activity-navigation'
import { TravelRequestsReview } from './review'

export default async function TravelRequestsPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
    const { supabase } = await requireAdmin()
    const selected = (await searchParams).request
    const { data, error } = await adminReadAll((from, to) => supabase.from('enrollment_requests')
        .select('id,child_name,birth_date,guardian_name,email,phone,notes,status,tournament_details,accepted_child_id,created_at')
        .eq('service', 'tournament').not('tournament_details', 'is', null).order('created_at', { ascending: false }).order('id').range(from, to))
    if (error) throw new Error('No se pudieron cargar las solicitudes de torneos.')
    return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8"><ActivityNavigation /><h1 className="text-3xl font-black text-navy">Solicitudes · Torneos 2027</h1><p>Revisa jugador, fechas y cuotas. Aceptar vincula la plaza y prepara el correo de bienvenida. El pago queda pendiente por transferencia: contacta con la familia para acordar fechas y comprueba cada ingreso en el banco antes de registrarlo en Finanzas.</p><Link className="font-semibold underline" href="/admin/torneos/inscripciones">Ver inscripciones de Navidad</Link><TravelRequestsReview requests={(data || []).filter(r => !selected || r.id === selected)} /></main>
}
