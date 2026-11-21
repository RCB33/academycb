import Link from 'next/link'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { AcademyRequestReview } from '@/components/management/academy-request-review'
import type { AcademyRequestReviewContext } from '@/lib/academy-request-review'

export default async function AcademyRequestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin()
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return <p className="p-8">Solicitud no válida.</p>
  const { data, error } = await supabase.rpc('academy_request_review_context', { request_uuid: id })
  const context = data as AcademyRequestReviewContext | null
  if (error || !context || !['new', 'contacted', 'interested'].includes(context.request.status)) {
    return <div className="mx-auto max-w-2xl space-y-4 p-8"><h1 className="text-2xl font-bold text-navy">Revisión de solicitud</h1><p>{error?.message || 'Esta solicitud ya está tramitada. Sus importes no se pueden cambiar desde esta pantalla.'}</p><Link href={`/admin/leads?request=${id}`} className="inline-flex rounded-xl bg-navy px-5 py-3 text-white">Ver solicitud</Link></div>
  }
  return <AcademyRequestReview context={context} />
}
