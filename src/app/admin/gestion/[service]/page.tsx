import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getAcademyOffer,getCampusOffers,getTournamentOffer } from '@/lib/offering-server'
import { OfferingEditor } from './offering-editor'
export default async function ManagementPage({params}:{params:Promise<{service:string}>}) {
  const {supabase}=await requireAdmin();const {service}=await params
  if(!['academia','campus','torneos'].includes(service)) notFound()
  const academy=service==='academia'?await getAcademyOffer(true):null
  const campuses=service==='campus'?await getCampusOffers(true):[]
  const tournaments=service==='torneos'?await getTournamentOffer():null
  const {data:categories}=await supabase.from('categories').select('id,name').eq('is_active',true).order('sort_order')
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><Link href="/admin/gestion" className="text-sm font-bold underline">← Gestión de Academia</Link><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Oferta publicada</p><h1 className="mt-2 text-3xl font-black capitalize">{service}</h1><p className="mt-3 max-w-2xl text-slate-600">Guarda cada ficha para actualizar la web y las nuevas inscripciones. Las solicitudes anteriores conservan las condiciones que eligió la familia.</p></div><Link href={`/${service}`} target="_blank" className="rounded-xl border bg-white px-5 py-3 font-bold">Ver página pública ↗</Link></header><OfferingEditor academy={academy} campuses={campuses} tournaments={tournaments} categories={categories||[]} service={service}/></main>
}
