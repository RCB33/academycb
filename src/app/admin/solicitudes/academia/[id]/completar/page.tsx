import Link from 'next/link'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getAcademyOffer } from '@/lib/offering-server'
import { AcademyRequestCompletion } from '@/components/management/academy-request-completion'
import type { AcademyCompletionContext } from '@/lib/academy-request-completion'

export default async function CompleteAcademyRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin()
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return <p className="p-8">Solicitud no válida.</p>
  const { data, error } = await supabase.rpc('academy_request_completion_context', { request_uuid: id })
  if (error || !data) return <div className="space-y-4 p-8"><h1 className="text-2xl font-bold text-navy">Completar plan</h1><p>{error?.message || 'No se pudo cargar la solicitud.'}</p><Link href="/admin/solicitudes" className="font-bold text-navy underline">Volver a solicitudes</Link></div>
  const offer = await getAcademyOffer()
  return <AcademyRequestCompletion context={data as AcademyCompletionContext} offer={offer} />
}
