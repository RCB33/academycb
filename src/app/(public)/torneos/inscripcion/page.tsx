import { createClient } from '@/lib/supabase/server'
import { getEventFamily } from '@/app/actions/event-registrations'
import { EventRegistrationForm } from './registration-form'
import { EventAccess } from './access'
import Link from 'next/link'

export const metadata = { title: 'Inscripciones Navidad · Academy Costa Brava' }
export default async function EventRegistrationPage({ searchParams }: { searchParams: Promise<{ torneo?: string }> }) {
  const { torneo } = await searchParams
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  let family: Awaited<ReturnType<typeof getEventFamily>> | null = null
  let error = ''
  if (user) { try { family = await getEventFamily() } catch (e) { error = e instanceof Error ? e.message : 'No se pudo recuperar la cuenta.' } }
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-navy"><div className="mx-auto max-w-4xl"><Link href="/torneos#navidad" className="text-sm underline">← Volver a los torneos</Link><p className="mt-8 text-sm font-bold uppercase tracking-widest text-amber-700">Navidad 2026–2027</p><h1 className="mt-2 text-3xl font-black md:text-5xl">Tu próxima experiencia Academy</h1><p className="my-5 text-slate-600">Una cuenta para toda la familia. Inscribe a cada hijo con sus torneos y conserva su ficha para futuras actividades.</p>
    {!user ? <EventAccess /> : error ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-6">{error}<p className="mt-3">Ayuda: <a href="tel:+34654139429" className="underline">654 139 429</a></p></div> : family ? <EventRegistrationForm family={family} initialTournament={torneo} /> : null}
  </div></main>
}
