
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import { createClient } from '@/lib/supabase/server'
import { getEventFamily } from '@/app/actions/event-registrations'
import { EventRegistrationForm } from './registration-form'
import { EventAccess } from './access'
import Link from 'next/link'

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({ title: 'Inscripciones Navidad · Academy Costa Brava' }, translate)
}
export default async function EventRegistrationPage({ searchParams }: { searchParams: Promise<{ torneo?: string; attempt?: string }> }) {
    const translate = await getT()

  const { torneo, attempt } = await searchParams
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  let family: Awaited<ReturnType<typeof getEventFamily>> | null = null
  let error = ''
  if (user) { try { family = await getEventFamily() } catch (e) { error = e instanceof Error ? e.message : 'No se pudo recuperar la cuenta.' } }
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-navy"><div className="mx-auto max-w-4xl"><Link href="/torneos#navidad" className="text-sm underline">{translate("← Volver a los torneos")}</Link><p className="mt-8 text-sm font-bold uppercase tracking-widest text-amber-700">{translate("Navidad 2026–2027")}</p><h1 className="mt-2 text-3xl font-black md:text-5xl">{translate("Tu próxima experiencia Academy")}</h1><p className="my-5 text-slate-600">{translate("Una cuenta para toda la familia. Inscribe a cada hijo con sus torneos y conserva su ficha para futuras actividades.")}</p>
    {translate(!user ? <EventAccess /> : error ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-6">{translate(error)}<p className="mt-3">{translate("Ayuda: ")}<a href="tel:+34654139429" className="underline">{translate("654 139 429")}</a></p></div> : family ? <EventRegistrationForm family={family} initialTournament={torneo} returnedAttempt={attempt} /> : null)}
  </div></main>
}
